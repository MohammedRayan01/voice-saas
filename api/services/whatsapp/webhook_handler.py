"""Process inbound WhatsApp webhook events from Meta.

Handles:
  - Inbound text/media messages → store + run automations
  - Delivery/read status updates → update wa_messages
"""
from __future__ import annotations

from datetime import UTC, datetime

from loguru import logger
from sqlalchemy import select, update

from api.db.base_client import BaseDBClient
from api.db.models import ContactModel, OrganizationConfigurationModel, WaConversationModel, WaMessageModel, WhatsAppConfigModel
from api.enums import OrganizationConfigurationKey
from api.services.whatsapp.automation_runner import run_automations

_db = BaseDBClient()


async def handle_webhook_payload(payload: dict) -> None:
    """Entry point — called for every POST from Meta."""
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            phone_number_id = value.get("metadata", {}).get("phone_number_id")
            if not phone_number_id:
                continue

            org_id = await _org_id_for_phone_number(phone_number_id)
            if not org_id:
                logger.warning(f"[webhook] no org for phone_number_id={phone_number_id}")
                continue

            # Status updates (delivered/read receipts)
            for status in value.get("statuses", []):
                await _handle_status(status)

            # Inbound messages
            contacts_map = {
                c["wa_id"]: c["profile"]["name"]
                for c in value.get("contacts", [])
            }
            for msg in value.get("messages", []):
                await _handle_message(org_id, msg, contacts_map)


async def _org_id_for_phone_number(phone_number_id: str) -> int | None:
    async with _db.async_session() as s:
        r = await s.execute(
            select(WhatsAppConfigModel.organization_id).where(
                WhatsAppConfigModel.phone_number_id == phone_number_id
            )
        )
        row = r.scalar_one_or_none()
        return row


async def _handle_message(org_id: int, msg: dict, contacts_map: dict) -> None:
    sender_phone = msg.get("from", "")
    sender_name = contacts_map.get(sender_phone, "")
    msg_type = msg.get("type", "text")
    wamid = msg.get("id", "")

    content_text: str | None = None
    content_type = "text"
    media_url: str | None = None

    if msg_type == "text":
        content_text = msg.get("text", {}).get("body", "")
    elif msg_type in ("image", "video", "document", "audio", "sticker"):
        content_type = msg_type
        media_info = msg.get(msg_type, {})
        media_url = media_info.get("url")
        content_text = media_info.get("caption")
    elif msg_type == "location":
        content_type = "location"
        loc = msg.get("location", {})
        content_text = f"{loc.get('name', 'Location')}: {loc.get('latitude')},{loc.get('longitude')}"
    else:
        content_text = f"[{msg_type}]"

    # Upsert contact
    contact_id = await _upsert_contact(org_id, sender_phone, sender_name)

    # Upsert conversation (open or create)
    conv_id = await _upsert_conversation(org_id, contact_id, content_text)

    # Store message
    async with _db.async_session() as s:
        s.add(WaMessageModel(
            conversation_id=conv_id,
            sender_type="customer",
            content_type=content_type,
            content_text=content_text,
            media_url=media_url,
            wamid=wamid,
            status="delivered",
        ))
        await s.commit()

    # Run automations
    await run_automations(
        org_id=org_id,
        trigger_type="new_message_received",
        context={
            "message_text": content_text or "",
            "conversation_id": conv_id,
            "contact_id": contact_id,
            "sender_phone": sender_phone,
        },
    )

    # If the org has a WhatsApp workflow configured and this is a text message,
    # run the workflow-powered AI and send a reply.
    if content_type == "text" and content_text:
        await _maybe_run_workflow_reply(org_id, sender_phone, content_text, contact_id)


async def _maybe_run_workflow_reply(
    org_id: int, sender_phone: str, message_text: str, contact_id: int | None
) -> None:
    """If org has WHATSAPP_WORKFLOW_ID configured, run the workflow AI and send reply."""
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrganizationConfigurationModel).where(
                OrganizationConfigurationModel.organization_id == org_id,
                OrganizationConfigurationModel.key
                == OrganizationConfigurationKey.WHATSAPP_WORKFLOW_ID.value,
            )
        )
        cfg = r.scalar_one_or_none()

    if not cfg or not cfg.value:
        return

    workflow_id_str = cfg.value
    try:
        workflow_id = int(workflow_id_str)
    except (ValueError, TypeError):
        logger.warning(f"[webhook] invalid WHATSAPP_WORKFLOW_ID={workflow_id_str!r} for org={org_id}")
        return

    system_prompt = await _extract_workflow_system_prompt(org_id, workflow_id)

    from api.services.workflow.text_engine import text_engine
    from api.services.whatsapp import meta_client

    try:
        result = await text_engine.run_turn(
            organization_id=org_id,
            phone=sender_phone,
            message=message_text,
            contact_id=contact_id,
            system_prompt_override=system_prompt,
        )
        reply = result.get("reply", "")
        if reply:
            await meta_client.send_text(org_id, sender_phone, reply)
    except Exception as exc:
        logger.error(f"[webhook] workflow AI reply failed org={org_id}: {exc}")


async def _extract_workflow_system_prompt(org_id: int, workflow_id: int) -> str | None:
    """Load the workflow and return the first agentNode's prompt, or None."""
    try:
        from api.db import db_client as _wf_client
        workflow = await _wf_client.get_workflow(workflow_id, organization_id=org_id)
        if not workflow:
            return None
        definition = getattr(workflow, "workflow_definition", None)
        if not definition:
            current_def = getattr(workflow, "current_definition", None)
            released_def = getattr(workflow, "released_definition", None)
            source = current_def or released_def
            if source:
                definition = getattr(source, "workflow_json", None)
        if not definition:
            return None
        for node in definition.get("nodes", []):
            node_type = node.get("type", "")
            if node_type in ("agentNode", "startCall", "globalNode"):
                prompt = node.get("data", {}).get("prompt")
                if prompt:
                    return prompt
        return None
    except Exception as exc:
        logger.warning(f"[webhook] could not extract workflow prompt: {exc}")
        return None


async def _upsert_contact(org_id: int, phone: str, name: str) -> int:
    async with _db.async_session() as s:
        r = await s.execute(
            select(ContactModel).where(
                ContactModel.organization_id == org_id,
                ContactModel.phone == phone,
            )
        )
        contact = r.scalar_one_or_none()
        if contact:
            return contact.id
        contact = ContactModel(
            organization_id=org_id,
            phone=phone,
            first_name=name.split(" ")[0] if name else "",
            last_name=" ".join(name.split(" ")[1:]) if name and " " in name else None,
        )
        s.add(contact)
        await s.commit()
        await s.refresh(contact)
        return contact.id


async def _upsert_conversation(org_id: int, contact_id: int, last_text: str | None) -> int:
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaConversationModel).where(
                WaConversationModel.organization_id == org_id,
                WaConversationModel.contact_id == contact_id,
                WaConversationModel.status != "closed",
            )
        )
        conv = r.scalar_one_or_none()
        if conv:
            await s.execute(
                update(WaConversationModel)
                .where(WaConversationModel.id == conv.id)
                .values(
                    last_message_text=last_text,
                    last_message_at=datetime.now(UTC),
                    unread_count=WaConversationModel.unread_count + 1,
                    updated_at=datetime.now(UTC),
                )
            )
            await s.commit()
            return conv.id
        conv = WaConversationModel(
            organization_id=org_id,
            contact_id=contact_id,
            status="open",
            last_message_text=last_text,
            last_message_at=datetime.now(UTC),
            unread_count=1,
        )
        s.add(conv)
        await s.commit()
        await s.refresh(conv)
        return conv.id


async def _handle_status(status: dict) -> None:
    wamid = status.get("id")
    new_status = status.get("status")
    if not wamid or not new_status:
        return
    ts = status.get("timestamp")
    field_map = {
        "delivered": WaMessageModel.status,
        "read": WaMessageModel.status,
        "failed": WaMessageModel.status,
    }
    if new_status not in field_map:
        return
    async with _db.async_session() as s:
        await s.execute(
            update(WaMessageModel)
            .where(WaMessageModel.wamid == wamid)
            .values(status=new_status)
        )
        await s.commit()
