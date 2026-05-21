"""Fan out call events to org-level webhook subscriptions."""

import hashlib
import hmac
import json
from datetime import UTC, datetime

import httpx
from loguru import logger

from api.db import db_client


async def dispatch_event(organization_id: int, event: str, payload: dict) -> None:
    """Send event payload to all active webhook subscriptions for this org+event."""
    subscriptions = await db_client.get_active_webhooks_for_event(organization_id, event)
    if not subscriptions:
        return

    body = json.dumps({"event": event, "timestamp": datetime.now(UTC).isoformat(), **payload})

    async with httpx.AsyncClient(timeout=10) as client:
        for sub in subscriptions:
            headers = {"Content-Type": "application/json"}
            if sub.secret:
                sig = hmac.new(sub.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
                headers["X-Signature-SHA256"] = f"sha256={sig}"
            try:
                resp = await client.post(sub.url, content=body, headers=headers)
                logger.debug(f"Webhook {sub.id} → {sub.url}: {resp.status_code}")
            except Exception as e:
                logger.warning(f"Webhook {sub.id} delivery failed: {e}")
