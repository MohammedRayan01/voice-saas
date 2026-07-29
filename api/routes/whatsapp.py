"""WhatsApp routes — webhook, inbox, config, broadcasts, pipelines, automations."""
from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select, update, func, delete, or_, cast, String

from api.db import db_client
from api.db.base_client import BaseDBClient
from api.db.models import (
    ContactModel,
    UserModel,
    WaAutomationModel,
    WaBroadcastModel,
    WaBroadcastRecipientModel,
    WaConversationModel,
    WaMessageModel,
    WaTagModel,
    WhatsAppConfigModel,
    PipelineModel,
    PipelineStageModel,
    DealModel,
)
from api.enums import OrganizationConfigurationKey
from api.services.auth.depends import get_user
from api.services.configuration.masking import is_mask_of, mask_key
from api.services.whatsapp import meta_client
from api.services.whatsapp.webhook_handler import handle_webhook_payload

router = APIRouter(prefix="/whatsapp")
_db = BaseDBClient()

META_APP_SECRET = os.getenv("META_APP_SECRET", "")


# ── Webhook ────────────────────────────────────────────────────────────────────

@router.get("/webhook")
async def webhook_verify(request: Request):
    """Meta webhook verification challenge."""
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    challenge = params.get("hub.challenge")
    token = params.get("hub.verify_token")
    if mode == "subscribe" and challenge:
        async with _db.async_session() as s:
            r = await s.execute(
                select(WhatsAppConfigModel).where(
                    WhatsAppConfigModel.verify_token == token
                )
            )
            if r.scalar_one_or_none():
                return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def webhook_receive(request: Request, background: BackgroundTasks):
    """Receive inbound WhatsApp messages from Meta."""
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")
    if META_APP_SECRET and not meta_client.verify_webhook_signature(body, sig, META_APP_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")
    payload = await request.json()
    background.add_task(handle_webhook_payload, payload)
    return {"status": "ok"}


# ── WhatsApp Config ────────────────────────────────────────────────────────────

class WhatsAppConfigSchema(BaseModel):
    phone_number_id: str
    waba_id: Optional[str] = None
    access_token: str
    verify_token: str


class WhatsAppConfigResponse(BaseModel):
    id: int
    phone_number_id: str
    waba_id: Optional[str]
    status: str
    connected_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/config", response_model=Optional[WhatsAppConfigResponse])
async def get_whatsapp_config(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WhatsAppConfigModel).where(WhatsAppConfigModel.organization_id == org_id)
        )
        return r.scalar_one_or_none()


@router.post("/config", response_model=WhatsAppConfigResponse)
async def save_whatsapp_config(body: WhatsAppConfigSchema, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WhatsAppConfigModel).where(WhatsAppConfigModel.organization_id == org_id)
        )
        cfg = r.scalar_one_or_none()
        now = datetime.now(UTC)
        if cfg:
            cfg.phone_number_id = body.phone_number_id
            cfg.waba_id = body.waba_id
            cfg.access_token = body.access_token
            cfg.verify_token = body.verify_token
            cfg.status = "connected"
            cfg.connected_at = now
            cfg.updated_at = now
        else:
            cfg = WhatsAppConfigModel(
                organization_id=org_id,
                phone_number_id=body.phone_number_id,
                waba_id=body.waba_id,
                access_token=body.access_token,
                verify_token=body.verify_token,
                status="connected",
                connected_at=now,
            )
            s.add(cfg)
        await s.commit()
        await s.refresh(cfg)
        return cfg


@router.delete("/config")
async def disconnect_whatsapp(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        await s.execute(
            update(WhatsAppConfigModel)
            .where(WhatsAppConfigModel.organization_id == org_id)
            .values(status="disconnected")
        )
        await s.commit()
    return {"disconnected": True}


# ── WhatsApp AI Configuration (agent + model) ──────────────────────────────────
# Controls which workflow's persona replies on WhatsApp (WHATSAPP_WORKFLOW_ID)
# and which LLM generates those replies (WHATSAPP_MODEL_CONFIG). Both are read
# by services/whatsapp/webhook_handler.py::_maybe_run_workflow_reply.

class WhatsAppLLMConfig(BaseModel):
    provider: str
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    endpoint: Optional[str] = None


class WhatsAppAIConfigRequest(BaseModel):
    workflow_id: Optional[int] = None
    llm: Optional[WhatsAppLLMConfig] = None


class WhatsAppAIConfigResponse(BaseModel):
    workflow_id: Optional[int] = None
    llm: Optional[WhatsAppLLMConfig] = None


@router.get("/ai-config", response_model=WhatsAppAIConfigResponse)
async def get_whatsapp_ai_config(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    workflow_cfg = await db_client.get_configuration(
        org_id, OrganizationConfigurationKey.WHATSAPP_WORKFLOW_ID.value
    )
    model_cfg = await db_client.get_configuration(
        org_id, OrganizationConfigurationKey.WHATSAPP_MODEL_CONFIG.value
    )

    workflow_id = None
    if workflow_cfg and workflow_cfg.value:
        try:
            workflow_id = int(workflow_cfg.value)
        except (ValueError, TypeError):
            workflow_id = None

    llm = None
    if model_cfg and model_cfg.value and model_cfg.value.get("provider"):
        llm = WhatsAppLLMConfig(
            provider=model_cfg.value.get("provider", ""),
            model=model_cfg.value.get("model", ""),
            api_key=mask_key(model_cfg.value.get("api_key", "")) if model_cfg.value.get("api_key") else None,
            base_url=model_cfg.value.get("base_url"),
            endpoint=model_cfg.value.get("endpoint"),
        )

    return WhatsAppAIConfigResponse(workflow_id=workflow_id, llm=llm)


@router.post("/ai-config", response_model=WhatsAppAIConfigResponse)
async def save_whatsapp_ai_config(
    body: WhatsAppAIConfigRequest, user: UserModel = Depends(get_user)
):
    org_id = user.selected_organization_id

    if body.workflow_id is not None:
        workflow = await db_client.get_workflow(body.workflow_id, organization_id=org_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

    if body.workflow_id is not None:
        await db_client.upsert_configuration(
            org_id,
            OrganizationConfigurationKey.WHATSAPP_WORKFLOW_ID.value,
            str(body.workflow_id),
        )
    else:
        await db_client.delete_configuration(
            org_id, OrganizationConfigurationKey.WHATSAPP_WORKFLOW_ID.value
        )

    if body.llm is not None:
        existing_model_cfg = await db_client.get_configuration(
            org_id, OrganizationConfigurationKey.WHATSAPP_MODEL_CONFIG.value
        )
        existing_api_key = (
            existing_model_cfg.value.get("api_key", "")
            if existing_model_cfg and existing_model_cfg.value
            else ""
        )

        incoming_api_key = body.llm.api_key or ""
        api_key = (
            existing_api_key
            if incoming_api_key and is_mask_of(incoming_api_key, existing_api_key)
            else incoming_api_key
        )

        await db_client.upsert_configuration(
            org_id,
            OrganizationConfigurationKey.WHATSAPP_MODEL_CONFIG.value,
            {
                "provider": body.llm.provider,
                "model": body.llm.model,
                "api_key": api_key,
                "base_url": body.llm.base_url,
                "endpoint": body.llm.endpoint,
            },
        )
    else:
        await db_client.delete_configuration(
            org_id, OrganizationConfigurationKey.WHATSAPP_MODEL_CONFIG.value
        )

    return await get_whatsapp_ai_config(user)


# ── Conversations / Inbox ──────────────────────────────────────────────────────

class ConversationResponse(BaseModel):
    id: int
    contact_id: int
    contact_name: Optional[str]
    contact_phone: Optional[str]
    status: str
    assigned_agent_id: Optional[int]
    last_message_text: Optional[str]
    last_message_at: Optional[datetime]
    unread_count: int
    updated_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        q = (
            select(
                WaConversationModel,
                ContactModel.first_name,
                ContactModel.last_name,
                ContactModel.phone,
            )
            .join(ContactModel, ContactModel.id == WaConversationModel.contact_id)
            .where(WaConversationModel.organization_id == org_id)
        )
        if status:
            q = q.where(WaConversationModel.status == status)
        q = q.order_by(WaConversationModel.updated_at.desc()).offset(offset).limit(limit)
        rows = (await s.execute(q)).all()

    result = []
    for conv, first, last, phone in rows:
        name = " ".join(filter(None, [first, last])) or phone or ""
        result.append(ConversationResponse(
            id=conv.id,
            contact_id=conv.contact_id,
            contact_name=name,
            contact_phone=phone,
            status=conv.status,
            assigned_agent_id=conv.assigned_agent_id,
            last_message_text=conv.last_message_text,
            last_message_at=conv.last_message_at,
            unread_count=conv.unread_count,
            updated_at=conv.updated_at,
            created_at=conv.created_at,
        ))
    return result


class MessageResponse(BaseModel):
    id: int
    sender_type: str
    content_type: str
    content_text: Optional[str]
    media_url: Optional[str]
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/conversations/{conv_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conv_id: int,
    limit: int = Query(100, le=500),
    before_id: Optional[int] = Query(None),
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        # Verify org owns conversation
        r = await s.execute(
            select(WaConversationModel).where(
                WaConversationModel.id == conv_id,
                WaConversationModel.organization_id == org_id,
            )
        )
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Conversation not found")

        q = select(WaMessageModel).where(WaMessageModel.conversation_id == conv_id)
        if before_id:
            q = q.where(WaMessageModel.id < before_id)
        q = q.order_by(WaMessageModel.created_at.asc()).limit(limit)
        messages = (await s.execute(q)).scalars().all()
        result = [MessageResponse.model_validate(m) for m in messages]
        # Mark as read
        await s.execute(
            update(WaConversationModel)
            .where(WaConversationModel.id == conv_id)
            .values(unread_count=0)
        )
        await s.commit()
    return result


class SendMessageBody(BaseModel):
    text: str


@router.post("/conversations/{conv_id}/send", response_model=MessageResponse)
async def send_message(
    conv_id: int,
    body: SendMessageBody,
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaConversationModel, ContactModel.phone)
            .join(ContactModel, ContactModel.id == WaConversationModel.contact_id)
            .where(
                WaConversationModel.id == conv_id,
                WaConversationModel.organization_id == org_id,
            )
        )
        row = r.first()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv, phone = row

    result = await meta_client.send_text(org_id, phone, body.text)
    wamid = result.get("messages", [{}])[0].get("id")
    now = datetime.now(UTC)
    async with _db.async_session() as s:
        msg = WaMessageModel(
            conversation_id=conv_id,
            sender_type="agent",
            sender_id=user.id,
            content_type="text",
            content_text=body.text,
            wamid=wamid,
            status="sent",
        )
        s.add(msg)
        await s.execute(
            update(WaConversationModel)
            .where(WaConversationModel.id == conv_id)
            .values(last_message_text=body.text, last_message_at=now, updated_at=now)
        )
        await s.commit()
        await s.refresh(msg)
    return msg


@router.patch("/conversations/{conv_id}")
async def update_conversation(
    conv_id: int,
    body: dict,
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    allowed = {"status", "assigned_agent_id"}
    values = {k: v for k, v in body.items() if k in allowed}
    if not values:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    async with _db.async_session() as s:
        await s.execute(
            update(WaConversationModel)
            .where(WaConversationModel.id == conv_id, WaConversationModel.organization_id == org_id)
            .values(**values, updated_at=datetime.now(UTC))
        )
        await s.commit()
    return {"updated": True}


# ── Automations ────────────────────────────────────────────────────────────────

class AutomationResponse(BaseModel):
    id: int
    name: str
    trigger_type: str
    trigger_config: dict
    steps: list
    is_active: bool
    run_count: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AutomationCreate(BaseModel):
    name: str
    trigger_type: str
    trigger_config: dict = {}
    steps: list = []
    is_active: bool = True


@router.get("/automations", response_model=List[AutomationResponse])
async def list_automations(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaAutomationModel)
            .where(WaAutomationModel.organization_id == org_id)
            .order_by(WaAutomationModel.created_at.desc())
        )
        return r.scalars().all()


@router.post("/automations", response_model=AutomationResponse)
async def create_automation(body: AutomationCreate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        auto = WaAutomationModel(
            organization_id=org_id,
            name=body.name,
            trigger_type=body.trigger_type,
            trigger_config=body.trigger_config,
            steps=body.steps,
            is_active=body.is_active,
        )
        s.add(auto)
        await s.commit()
        await s.refresh(auto)
        return auto


@router.put("/automations/{auto_id}", response_model=AutomationResponse)
async def update_automation(auto_id: int, body: AutomationCreate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaAutomationModel).where(
                WaAutomationModel.id == auto_id, WaAutomationModel.organization_id == org_id
            )
        )
        auto = r.scalar_one_or_none()
        if not auto:
            raise HTTPException(status_code=404)
        for field, val in body.model_dump().items():
            setattr(auto, field, val)
        auto.updated_at = datetime.now(UTC)
        await s.commit()
        await s.refresh(auto)
        return auto


@router.delete("/automations/{auto_id}")
async def delete_automation(auto_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaAutomationModel).where(
                WaAutomationModel.id == auto_id, WaAutomationModel.organization_id == org_id
            )
        )
        auto = r.scalar_one_or_none()
        if not auto:
            raise HTTPException(status_code=404)
        await s.delete(auto)
        await s.commit()
    return {"deleted": True}


# ── Pipelines ──────────────────────────────────────────────────────────────────

class PipelineStageSchema(BaseModel):
    name: str
    position: int = 0
    color: str = "#3b82f6"


class PipelineSchema(BaseModel):
    name: str
    stages: List[PipelineStageSchema] = []


class PipelineResponse(BaseModel):
    id: int
    name: str
    stages: List[dict] = []
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/pipelines", response_model=List[PipelineResponse])
async def list_pipelines(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(PipelineModel).where(PipelineModel.organization_id == org_id)
        )
        pipelines = r.scalars().all()
        result = []
        for p in pipelines:
            sr = await s.execute(
                select(PipelineStageModel).where(PipelineStageModel.pipeline_id == p.id)
                .order_by(PipelineStageModel.position)
            )
            stages = [{"id": st.id, "name": st.name, "position": st.position, "color": st.color} for st in sr.scalars().all()]
            result.append(PipelineResponse(id=p.id, name=p.name, stages=stages, created_at=p.created_at))
    return result


@router.post("/pipelines", response_model=PipelineResponse)
async def create_pipeline(body: PipelineSchema, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        p = PipelineModel(organization_id=org_id, name=body.name)
        s.add(p)
        await s.flush()
        stages = []
        for i, st in enumerate(body.stages):
            stage = PipelineStageModel(pipeline_id=p.id, name=st.name, position=i, color=st.color)
            s.add(stage)
            stages.append({"id": None, "name": st.name, "position": i, "color": st.color})
        await s.commit()
        await s.refresh(p)
        return PipelineResponse(id=p.id, name=p.name, stages=stages, created_at=p.created_at)


# ── Broadcasts ─────────────────────────────────────────────────────────────────

class BroadcastCreate(BaseModel):
    name: str
    template_name: str
    template_language: str = "en_US"
    template_variables: Optional[dict] = None
    audience_filter: Optional[dict] = None
    phone_numbers: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None


class BroadcastResponse(BaseModel):
    id: int
    name: str
    template_name: str
    template_language: str
    status: str
    total_recipients: int
    sent_count: int
    delivered_count: int
    read_count: int
    failed_count: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/broadcasts", response_model=List[BroadcastResponse])
async def list_broadcasts(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaBroadcastModel)
            .where(WaBroadcastModel.organization_id == org_id)
            .order_by(WaBroadcastModel.created_at.desc())
        )
        return r.scalars().all()


@router.post("/broadcasts", response_model=BroadcastResponse)
async def create_broadcast(body: BroadcastCreate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    # An explicit phone-number list is the simplest audience; store it inside
    # audience_filter so _execute_broadcast has a single place to resolve
    # recipients from.
    audience_filter = dict(body.audience_filter or {})
    if body.phone_numbers:
        audience_filter["phone_numbers"] = body.phone_numbers
    async with _db.async_session() as s:
        b = WaBroadcastModel(
            organization_id=org_id,
            name=body.name,
            template_name=body.template_name,
            template_language=body.template_language,
            template_variables=body.template_variables,
            audience_filter=audience_filter or None,
            scheduled_at=body.scheduled_at,
            status="draft",
        )
        s.add(b)
        await s.commit()
        await s.refresh(b)
        return b


@router.delete("/broadcasts/{broadcast_id}")
async def delete_broadcast(broadcast_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaBroadcastModel).where(
                WaBroadcastModel.id == broadcast_id,
                WaBroadcastModel.organization_id == org_id,
            )
        )
        b = r.scalar_one_or_none()
        if not b:
            raise HTTPException(status_code=404)
        if b.status == "sending":
            raise HTTPException(status_code=400, detail="Cannot delete a broadcast while it is sending")
        await s.delete(b)
        await s.commit()
    return {"deleted": True}


@router.post("/broadcasts/{broadcast_id}/send")
async def send_broadcast(broadcast_id: int, background: BackgroundTasks, user: UserModel = Depends(get_user)):
    """Queue a broadcast for sending."""
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaBroadcastModel).where(
                WaBroadcastModel.id == broadcast_id,
                WaBroadcastModel.organization_id == org_id,
            )
        )
        b = r.scalar_one_or_none()
        if not b:
            raise HTTPException(status_code=404)
        if b.status not in ("draft", "failed"):
            raise HTTPException(status_code=400, detail=f"Cannot send broadcast in status: {b.status}")
        await s.execute(
            update(WaBroadcastModel)
            .where(WaBroadcastModel.id == broadcast_id)
            .values(status="sending")
        )
        await s.commit()
    background.add_task(_execute_broadcast, broadcast_id, org_id)
    return {"queued": True}


async def _execute_broadcast(broadcast_id: int, org_id: int) -> None:
    from api.db.base_client import BaseDBClient
    db = BaseDBClient()
    async with db.async_session() as s:
        r = await s.execute(
            select(WaBroadcastModel).where(WaBroadcastModel.id == broadcast_id)
        )
        b = r.scalar_one_or_none()
        if not b:
            return

        # Resolve recipients from audience_filter. An explicit phone_numbers
        # list wins; a tags filter narrows contacts; otherwise all org
        # contacts with a phone number are targeted.
        audience = b.audience_filter or {}
        if audience.get("phone_numbers"):
            recipients = [p for p in audience["phone_numbers"] if p]
        else:
            q = select(ContactModel).where(ContactModel.organization_id == org_id)
            contacts = (await s.execute(q)).scalars().all()
            wanted_tags = set(audience.get("tags") or [])
            if wanted_tags:
                contacts = [c for c in contacts if wanted_tags & set(c.tags or [])]
            recipients = [c.phone for c in contacts if c.phone]

        # Meta expects template variables as body-component parameters, in
        # template placeholder order ({{1}}, {{2}}, ...).
        components = None
        if b.template_variables:
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(v)}
                        for v in b.template_variables.values()
                    ],
                }
            ]

        sent = failed = 0
        for phone in recipients:
            try:
                await meta_client.send_template(
                    org_id,
                    phone,
                    b.template_name,
                    b.template_language,
                    components=components,
                )
                sent += 1
            except Exception as exc:
                logger.warning(f"[broadcast] failed for {phone}: {exc}")
                failed += 1

        await s.execute(
            update(WaBroadcastModel)
            .where(WaBroadcastModel.id == broadcast_id)
            .values(
                status="sent",
                total_recipients=sent + failed,
                sent_count=sent,
                failed_count=failed,
            )
        )
        await s.commit()


# ── Contacts CRUD ─────────────────────────────────────────────────────────────

class ContactResponse(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []


@router.get("/contacts", response_model=List[ContactResponse])
async def list_contacts(
    search: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    page_size: int = Query(25, ge=1, le=100),
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        q = select(ContactModel).where(ContactModel.organization_id == org_id)
        if search:
            term = f"%{search}%"
            q = q.where(
                or_(
                    ContactModel.first_name.ilike(term),
                    ContactModel.last_name.ilike(term),
                    ContactModel.phone.ilike(term),
                    ContactModel.email.ilike(term),
                    ContactModel.company.ilike(term),
                )
            )
        q = q.order_by(ContactModel.created_at.desc()).offset(page * page_size).limit(page_size)
        r = await s.execute(q)
        return r.scalars().all()


@router.post("/contacts", response_model=ContactResponse)
async def create_contact(body: ContactCreate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        c = ContactModel(
            organization_id=org_id,
            first_name=body.first_name,
            last_name=body.last_name,
            phone=body.phone,
            email=body.email,
            company=body.company,
            tags=body.tags,
        )
        s.add(c)
        await s.commit()
        await s.refresh(c)
        return c


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: int, body: ContactCreate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(ContactModel).where(
                ContactModel.id == contact_id,
                ContactModel.organization_id == org_id,
            )
        )
        c = r.scalar_one_or_none()
        if not c:
            raise HTTPException(status_code=404)
        c.first_name = body.first_name
        c.last_name = body.last_name
        c.phone = body.phone
        c.email = body.email
        c.company = body.company
        c.tags = body.tags
        await s.commit()
        await s.refresh(c)
        return c


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(ContactModel).where(
                ContactModel.id == contact_id,
                ContactModel.organization_id == org_id,
            )
        )
        c = r.scalar_one_or_none()
        if not c:
            raise HTTPException(status_code=404)
        await s.delete(c)
        await s.commit()
    return {"deleted": True}


# ── Pipeline update/delete + Deals CRUD ──────────────────────────────────────

class DealResponse(BaseModel):
    id: int
    pipeline_id: int
    stage_id: int
    contact_id: Optional[int] = None
    title: str
    value: float
    currency: str = "INR"
    notes: Optional[str] = None
    expected_close_date: Optional[str] = None
    status: str = "active"
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    stage_name: Optional[str] = None
    stage_color: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DealCreate(BaseModel):
    pipeline_id: int
    stage_id: int
    contact_id: Optional[int] = None
    title: str
    value: float = 0
    currency: str = "INR"
    notes: Optional[str] = None
    expected_close_date: Optional[str] = None


class DealUpdate(BaseModel):
    stage_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    expected_close_date: Optional[str] = None
    status: Optional[str] = None


@router.put("/pipelines/{pipeline_id}")
async def update_pipeline_name(pipeline_id: int, body: PipelineSchema, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(PipelineModel).where(
                PipelineModel.id == pipeline_id,
                PipelineModel.organization_id == org_id,
            )
        )
        p = r.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404)
        p.name = body.name
        await s.commit()
        stages_r = await s.execute(
            select(PipelineStageModel).where(PipelineStageModel.pipeline_id == p.id)
            .order_by(PipelineStageModel.position)
        )
        stages = stages_r.scalars().all()
        return {"id": p.id, "name": p.name, "created_at": p.created_at, "stages": [
            {"id": st.id, "name": st.name, "position": st.position, "color": st.color}
            for st in stages
        ]}


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline_by_id(pipeline_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(PipelineModel).where(
                PipelineModel.id == pipeline_id,
                PipelineModel.organization_id == org_id,
            )
        )
        p = r.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404)
        await s.delete(p)
        await s.commit()
    return {"deleted": True}


@router.get("/pipelines/{pipeline_id}/deals", response_model=List[DealResponse])
async def list_deals(pipeline_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(DealModel).where(
                DealModel.pipeline_id == pipeline_id,
                DealModel.organization_id == org_id,
            ).order_by(DealModel.created_at.asc())
        )
        deals = r.scalars().all()
        result = []
        for d in deals:
            contact_name = contact_phone = stage_name = stage_color = None
            if d.contact_id:
                cr = await s.execute(select(ContactModel).where(ContactModel.id == d.contact_id))
                c = cr.scalar_one_or_none()
                if c:
                    contact_name = f"{c.first_name or ''} {c.last_name or ''}".strip() or c.phone
                    contact_phone = c.phone
            sr = await s.execute(select(PipelineStageModel).where(PipelineStageModel.id == d.stage_id))
            stage = sr.scalar_one_or_none()
            if stage:
                stage_name = stage.name
                stage_color = stage.color
            result.append(DealResponse(
                id=d.id, pipeline_id=d.pipeline_id, stage_id=d.stage_id,
                contact_id=d.contact_id, title=d.title, value=float(d.value),
                currency=d.currency, notes=d.notes,
                expected_close_date=str(d.expected_close_date) if d.expected_close_date else None,
                status=d.status, contact_name=contact_name, contact_phone=contact_phone,
                stage_name=stage_name, stage_color=stage_color, created_at=d.created_at,
            ))
        return result


@router.post("/deals", response_model=DealResponse)
async def create_deal(body: DealCreate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        d = DealModel(
            organization_id=org_id,
            pipeline_id=body.pipeline_id,
            stage_id=body.stage_id,
            contact_id=body.contact_id,
            title=body.title,
            value=body.value,
            currency=body.currency,
            notes=body.notes,
            expected_close_date=body.expected_close_date,
        )
        s.add(d)
        await s.commit()
        await s.refresh(d)
        return DealResponse(
            id=d.id, pipeline_id=d.pipeline_id, stage_id=d.stage_id,
            contact_id=d.contact_id, title=d.title, value=float(d.value),
            currency=d.currency, notes=d.notes,
            expected_close_date=str(d.expected_close_date) if d.expected_close_date else None,
            status=d.status, created_at=d.created_at,
        )


@router.put("/deals/{deal_id}", response_model=DealResponse)
async def update_deal(deal_id: int, body: DealUpdate, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(DealModel).where(DealModel.id == deal_id, DealModel.organization_id == org_id)
        )
        d = r.scalar_one_or_none()
        if not d:
            raise HTTPException(status_code=404)
        if body.stage_id is not None:
            d.stage_id = body.stage_id
        if body.contact_id is not None:
            d.contact_id = body.contact_id
        if body.title is not None:
            d.title = body.title
        if body.value is not None:
            d.value = body.value
        if body.currency is not None:
            d.currency = body.currency
        if body.notes is not None:
            d.notes = body.notes
        if body.expected_close_date is not None:
            d.expected_close_date = body.expected_close_date
        if body.status is not None:
            d.status = body.status
        await s.commit()
        await s.refresh(d)
        return DealResponse(
            id=d.id, pipeline_id=d.pipeline_id, stage_id=d.stage_id,
            contact_id=d.contact_id, title=d.title, value=float(d.value),
            currency=d.currency, notes=d.notes,
            expected_close_date=str(d.expected_close_date) if d.expected_close_date else None,
            status=d.status, created_at=d.created_at,
        )


@router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(DealModel).where(DealModel.id == deal_id, DealModel.organization_id == org_id)
        )
        d = r.scalar_one_or_none()
        if not d:
            raise HTTPException(status_code=404)
        await s.delete(d)
        await s.commit()
    return {"deleted": True}


# ── Industry Packs ─────────────────────────────────────────────────────────────

class PackInstallRequest(BaseModel):
    config: dict


class PackReconfigureRequest(BaseModel):
    config: dict


@router.get("/packs")
async def list_packs(user: UserModel = Depends(get_user)):
    """List all available industry packs."""
    from api.services.whatsapp.pack_installer import pack_installer
    return {"packs": pack_installer.list_packs()}


@router.post("/packs/{pack_id}/install")
async def install_pack(
    pack_id: str,
    body: PackInstallRequest,
    user: UserModel = Depends(get_user),
):
    """Install an industry pack for the org. Runs the 5-step wizard installer."""
    from api.services.whatsapp.pack_installer import pack_installer
    org_id = user.selected_organization_id
    try:
        result = await pack_installer.install(org_id, pack_id, body.config)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return result


@router.get("/packs/installed")
async def get_installed_pack(user: UserModel = Depends(get_user)):
    """Get the currently installed pack for this org."""
    from api.services.whatsapp.pack_installer import pack_installer
    installed = await pack_installer.get_installed(user.selected_organization_id)
    if not installed:
        return {"installed": False}
    return installed


@router.put("/packs/installed")
async def reconfigure_pack(
    body: PackReconfigureRequest,
    user: UserModel = Depends(get_user),
):
    """Update wizard config without reinstalling automations (re-generates system prompt)."""
    from api.services.whatsapp.pack_installer import pack_installer
    org_id = user.selected_organization_id
    try:
        result = await pack_installer.reconfigure(org_id, body.config)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return result


@router.delete("/packs/installed")
async def uninstall_pack(user: UserModel = Depends(get_user)):
    """Uninstall the current industry pack (removes pack-created automations and pipeline)."""
    from api.services.whatsapp.pack_installer import pack_installer
    await pack_installer.uninstall(user.selected_organization_id)
    return {"uninstalled": True}
