"""Org-level outbound webhook subscriptions.

Customers register a URL + event list here. When a call event fires,
tasks/webhook_dispatcher.py fans out to all matching subscriptions.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl

from api.db import db_client
from api.db.models import UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

VALID_EVENTS = {
    "call.started",
    "call.ended",
    "call.transferred",
    "call.failed",
    "appointment.booked",
    "campaign.completed",
}


class WebhookSubscriptionRequest(BaseModel):
    url: HttpUrl
    events: List[str]
    secret: Optional[str] = None  # Used to sign payloads (HMAC-SHA256)
    name: Optional[str] = None


class WebhookSubscriptionResponse(BaseModel):
    id: int
    url: str
    events: List[str]
    name: Optional[str]
    is_active: bool
    created_at: str


class UpdateWebhookRequest(BaseModel):
    url: Optional[HttpUrl] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", response_model=List[WebhookSubscriptionResponse])
async def list_webhooks(user: UserModel = Depends(get_user)):
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")
    rows = await db_client.list_webhook_subscriptions(user.selected_organization_id)
    return [_to_response(r) for r in rows]


@router.post("", response_model=WebhookSubscriptionResponse)
async def create_webhook(request: WebhookSubscriptionRequest, user: UserModel = Depends(get_user)):
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    invalid = [e for e in request.events if e not in VALID_EVENTS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown events: {invalid}. Valid: {sorted(VALID_EVENTS)}")

    row = await db_client.create_webhook_subscription(
        organization_id=user.selected_organization_id,
        url=str(request.url),
        events=request.events,
        secret=request.secret,
        name=request.name,
    )
    return _to_response(row)


@router.patch("/{webhook_id}", response_model=WebhookSubscriptionResponse)
async def update_webhook(
    webhook_id: int, request: UpdateWebhookRequest, user: UserModel = Depends(get_user)
):
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    if request.events:
        invalid = [e for e in request.events if e not in VALID_EVENTS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Unknown events: {invalid}")

    row = await db_client.update_webhook_subscription(
        webhook_id=webhook_id,
        organization_id=user.selected_organization_id,
        url=str(request.url) if request.url else None,
        events=request.events,
        secret=request.secret,
        name=request.name,
        is_active=request.is_active,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return _to_response(row)


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: int, user: UserModel = Depends(get_user)):
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")
    deleted = await db_client.delete_webhook_subscription(webhook_id, user.selected_organization_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"message": "Webhook deleted"}


@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: int, user: UserModel = Depends(get_user)):
    """Send a test ping payload to the webhook URL."""
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")
    row = await db_client.get_webhook_subscription(webhook_id, user.selected_organization_id)
    if not row:
        raise HTTPException(status_code=404, detail="Webhook not found")

    import httpx
    payload = {"event": "test.ping", "organization_id": user.selected_organization_id}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(str(row.url), json=payload)
        return {"status_code": resp.status_code, "ok": resp.is_success}
    except Exception as e:
        return {"status_code": None, "ok": False, "error": str(e)}


def _to_response(row) -> WebhookSubscriptionResponse:
    return WebhookSubscriptionResponse(
        id=row.id,
        url=row.url,
        events=row.events or [],
        name=row.name,
        is_active=row.is_active,
        created_at=row.created_at.isoformat(),
    )
