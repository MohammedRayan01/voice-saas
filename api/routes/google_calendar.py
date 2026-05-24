"""Google Calendar OAuth routes."""
import os
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from api.db.models import UserModel
from api.db.organization_configuration_client import OrganizationConfigurationClient
from api.enums import OrganizationConfigurationKey
from api.services.auth.depends import get_user
from api.services.integrations.google_calendar import client as gcal

router = APIRouter(prefix="/integrations/google-calendar")

_config_client = OrganizationConfigurationClient()

FRONTEND_BASE_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


class CalendarStatus(BaseModel):
    connected: bool
    calendar_id: str | None = None
    email: str | None = None


@router.get("/connect")
async def connect_google_calendar(user: UserModel = Depends(get_user)):
    """Redirect to Google OAuth consent screen."""
    state = secrets.token_urlsafe(16)
    # Store state + org in a short-lived way — we embed org_id in state for simplicity
    encoded_state = f"{state}:{user.selected_organization_id}"
    url = gcal.build_auth_url(encoded_state)
    return RedirectResponse(url)


@router.get("/callback")
async def google_calendar_callback(code: str, state: str):
    """Handle Google OAuth callback, store tokens."""
    try:
        parts = state.rsplit(":", 1)
        if len(parts) != 2:
            raise ValueError("Invalid state")
        _, org_id_str = parts
        organization_id = int(org_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        tokens = await gcal.exchange_code_for_tokens(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    token_expiry = (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat()

    # Get primary calendar ID
    calendar_id = await gcal.get_primary_calendar_id(access_token) or "primary"

    await _config_client.upsert_configuration(
        organization_id,
        OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value,
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expiry": token_expiry,
            "calendar_id": calendar_id,
        },
    )

    return RedirectResponse(f"{FRONTEND_BASE_URL}/settings/integrations/google-calendar?connected=true")


@router.get("/status", response_model=CalendarStatus)
async def get_calendar_status(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    creds = await _config_client.get_configuration_value(
        org_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
    if not creds or not creds.get("access_token"):
        return CalendarStatus(connected=False)
    return CalendarStatus(
        connected=True,
        calendar_id=creds.get("calendar_id"),
    )


@router.delete("/disconnect", status_code=204)
async def disconnect_google_calendar(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    await _config_client.delete_configuration(
        org_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
