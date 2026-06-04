"""Process inbound WhatsApp webhook events from Meta.

Handles:
  - Inbound text/media messages → store + run automations
  - Delivery/read status updates → update wa_messages
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.db.base_client import BaseDBClient
from api.db.models import ContactModel, WaConversationModel, WaMessageModel, WhatsAppConfigModel
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
