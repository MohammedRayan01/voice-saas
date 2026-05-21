"""Billing routes — Razorpay subscription management.

Razorpay keys are injected via env vars RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
Until those are set, checkout returns 503 and webhooks are a no-op.
"""

import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from loguru import logger
from pydantic import BaseModel

from api.db import db_client
from api.db.models import UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/billing", tags=["billing"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

PLANS = {
    "starter": {
        "name": "Starter",
        "price_inr": 2999,
        "minutes_limit": 500,
        "seats_limit": 2,
        "razorpay_plan_id": os.getenv("RAZORPAY_PLAN_ID_STARTER", ""),
    },
    "growth": {
        "name": "Growth",
        "price_inr": 7999,
        "minutes_limit": 2000,
        "seats_limit": 5,
        "razorpay_plan_id": os.getenv("RAZORPAY_PLAN_ID_GROWTH", ""),
    },
    "scale": {
        "name": "Scale",
        "price_inr": 24999,
        "minutes_limit": None,  # unlimited
        "seats_limit": 20,
        "razorpay_plan_id": os.getenv("RAZORPAY_PLAN_ID_SCALE", ""),
    },
}


class PlanInfo(BaseModel):
    name: str
    price_inr: int
    minutes_limit: Optional[int]
    seats_limit: int


class BillingStatusResponse(BaseModel):
    plan: str
    subscription_status: str
    minutes_limit: Optional[int]
    seats_limit: Optional[int]
    trial_ends_at: Optional[str]
    plans: dict


class CheckoutRequest(BaseModel):
    plan: str  # "starter" | "growth" | "scale"


class CheckoutResponse(BaseModel):
    checkout_url: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    subscription_id: Optional[str] = None


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status(user: UserModel = Depends(get_user)):
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    org = await db_client.get_organization_by_id(user.selected_organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return BillingStatusResponse(
        plan=org.plan,
        subscription_status=org.subscription_status,
        minutes_limit=org.minutes_limit,
        seats_limit=org.seats_limit,
        trial_ends_at=org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        plans={k: PlanInfo(**{kk: vv for kk, vv in v.items() if kk != "razorpay_plan_id"}) for k, v in PLANS.items()},
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(request: CheckoutRequest, user: UserModel = Depends(get_user)):
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    if request.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {request.plan}")

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment.",
        )

    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        plan_config = PLANS[request.plan]

        org = await db_client.get_organization_by_id(user.selected_organization_id)

        # Create or reuse Razorpay customer
        if not org.razorpay_customer_id:
            customer = client.customer.create({
                "name": user.email or f"org_{org.id}",
                "email": user.email or "",
                "notes": {"organization_id": str(org.id)},
            })
            await db_client.update_organization_billing(
                org.id, razorpay_customer_id=customer["id"]
            )
            customer_id = customer["id"]
        else:
            customer_id = org.razorpay_customer_id

        subscription = client.subscription.create({
            "plan_id": plan_config["razorpay_plan_id"],
            "customer_notify": 1,
            "total_count": 12,
            "notes": {
                "organization_id": str(org.id),
                "plan": request.plan,
            },
        })

        await db_client.update_organization_billing(
            org.id,
            razorpay_subscription_id=subscription["id"],
            subscription_status="created",
        )

        return CheckoutResponse(
            razorpay_key_id=RAZORPAY_KEY_ID,
            subscription_id=subscription["id"],
        )
    except Exception as e:
        logger.error(f"Razorpay checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {e}")


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay subscription lifecycle events."""
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    payload = json.loads(body)
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    sub_id = entity.get("id")
    notes = entity.get("notes", {})
    org_id = notes.get("organization_id")
    plan = notes.get("plan", "starter")

    if not org_id or not sub_id:
        return {"status": "ignored"}

    org_id = int(org_id)
    plan_config = PLANS.get(plan, PLANS["starter"])

    if event == "subscription.activated":
        await db_client.update_organization_billing(
            org_id,
            plan=plan,
            subscription_status="active",
            minutes_limit=plan_config["minutes_limit"],
            seats_limit=plan_config["seats_limit"],
        )
        logger.info(f"Org {org_id} activated plan {plan}")

    elif event == "subscription.charged":
        await db_client.update_organization_billing(
            org_id,
            subscription_status="active",
        )
        logger.info(f"Org {org_id} subscription charged")

    elif event == "subscription.halted":
        await db_client.update_organization_billing(
            org_id,
            subscription_status="past_due",
        )
        logger.warning(f"Org {org_id} subscription halted (payment failed)")

    elif event == "subscription.cancelled":
        await db_client.update_organization_billing(
            org_id,
            plan="free",
            subscription_status="cancelled",
            minutes_limit=0,
        )
        logger.info(f"Org {org_id} subscription cancelled")

    return {"status": "ok"}
