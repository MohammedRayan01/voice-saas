"""WhatsApp Cloud API (Meta) client.

Handles sending messages and verifying webhook signatures.
Credentials are stored per-org in WhatsAppConfigModel.
"""
from __future__ import annotations

import hashlib
import hmac
import json
from typing import Optional

import httpx
from loguru import logger

from api.db.base_client import BaseDBClient
from api.db.models import WhatsAppConfigModel
from sqlalchemy import select

GRAPH_BASE = "https://graph.facebook.com/v19.0"

_db = BaseDBClient()


async def get_config(organization_id: int) -> Optional[WhatsAppConfigModel]:
    async with _db.async_session() as s:
        r = await s.execute(
            select(WhatsAppConfigModel).where(
                WhatsAppConfigModel.organization_id == organization_id
            )
        )
        return r.scalar_one_or_none()


async def send_text(organization_id: int, to_phone: str, text: str) -> dict:
    cfg = await get_config(organization_id)
    if not cfg or cfg.status != "connected":
        raise ValueError("WhatsApp not connected for this organisation")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_BASE}/{cfg.phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {cfg.access_token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "text",
                "text": {"body": text},
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


async def send_template(
    organization_id: int,
    to_phone: str,
    template_name: str,
    language: str = "en_US",
    components: Optional[list] = None,
) -> dict:
    cfg = await get_config(organization_id)
    if not cfg or cfg.status != "connected":
        raise ValueError("WhatsApp not connected for this organisation")
    payload: dict = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
        },
    }
    if components:
        payload["template"]["components"] = components
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_BASE}/{cfg.phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {cfg.access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


def verify_webhook_signature(payload: bytes, signature_header: str, app_secret: str) -> bool:
    """Verify X-Hub-Signature-256 from Meta."""
    if not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        app_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header[7:])
