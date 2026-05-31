"""WhatsApp AI chat inbound endpoint.

Called by wacrm's automation engine whenever a new WhatsApp message arrives.
Auth: X-API-Key header (existing Lynq API key system).
"""

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel

from api.db.contact_client import ContactClient
from api.db.models import UserModel
from api.services.auth.depends import get_user
from api.services.workflow.text_engine import text_engine

router = APIRouter(prefix="/chat")

_contact_client = ContactClient()


class ChatInboundRequest(BaseModel):
    phone: str
    message_text: str
    contact_name: str | None = None
    conversation_id: str | None = None   # wacrm conversation UUID, stored for reference


class ChatInboundResponse(BaseModel):
    reply: str
    action: str   # "reply" | "escalate" | "end"


@router.post("/inbound", response_model=ChatInboundResponse)
async def chat_inbound(
    body: ChatInboundRequest,
    user: UserModel = Depends(get_user),
) -> ChatInboundResponse:
    """Process one inbound WhatsApp message and return the AI reply.

    The caller (wacrm) is responsible for sending the reply back to the customer.
    """
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organisation selected for this API key")

    if not body.message_text or not body.message_text.strip():
        raise HTTPException(status_code=400, detail="message_text is required")

    logger.info(f"[chat] inbound org={org_id} phone={body.phone[:6]}*** msg_len={len(body.message_text)}")

    # Ensure contact exists in Lynq CRM
    await _upsert_contact(org_id, body.phone, body.contact_name)

    result = await text_engine.run_turn(
        organization_id=org_id,
        phone=body.phone,
        message=body.message_text,
    )

    logger.info(f"[chat] reply org={org_id} phone={body.phone[:6]}*** action={result['action']}")

    # Clear session history after escalation so a fresh conversation starts
    # if/when the customer reaches out again after a human handled them.
    if result["action"] == "escalate":
        await text_engine.clear_session(org_id, body.phone)

    return ChatInboundResponse(reply=result["reply"], action=result["action"])


@router.delete("/sessions/{phone}")
async def clear_chat_session(
    phone: str,
    user: UserModel = Depends(get_user),
) -> dict:
    """Clear the conversation history for a phone number.

    Call this when a human agent finishes handling an escalation so the
    AI starts fresh next time.
    """
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organisation selected")
    await text_engine.clear_session(org_id, phone)
    return {"cleared": True, "phone": phone}


# ------------------------------------------------------------------ #
# Internal helpers                                                     #
# ------------------------------------------------------------------ #

async def _upsert_contact(org_id: int, phone: str, name: str | None) -> None:
    """Create the contact in Lynq CRM if they don't exist yet."""
    try:
        existing = await _contact_client.get_contact_by_phone(phone, org_id)
        if not existing:
            data: dict = {"phone": phone}
            if name:
                parts = name.strip().split(" ", 1)
                data["first_name"] = parts[0]
                if len(parts) > 1:
                    data["last_name"] = parts[1]
            await _contact_client.create_contact(org_id, data)
    except Exception as exc:
        # Non-fatal — a missing CRM entry doesn't break the AI reply
        logger.warning(f"[chat] contact upsert failed org={org_id}: {exc}")
