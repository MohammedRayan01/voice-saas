"""Google Calendar OAuth routes."""
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

FRONTEND_BASE_URL = __import__("os").environ.get("FRONTEND_URL", "http://localhost:3000")


class CalendarStatus(BaseModel):
    connected: bool
    calendar_id: str | None = None
    has_oauth_app: bool = False


class OAuthAppConfig(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: str


class OAuthAppResponse(BaseModel):
    client_id: str
    redirect_uri: str
    has_secret: bool


@router.get("/oauth-app", response_model=OAuthAppResponse)
async def get_oauth_app_config(user: UserModel = Depends(get_user)):
    """Return saved OAuth app config (secret masked)."""
    org_id = user.selected_organization_id
    app = await _config_client.get_configuration_value(
        org_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_OAUTH_APP.value
    )
    if not app:
        raise HTTPException(status_code=404, detail="OAuth app not configured")
    return OAuthAppResponse(
        client_id=app.get("client_id", ""),
        redirect_uri=app.get("redirect_uri", ""),
        has_secret=bool(app.get("client_secret")),
    )


@router.post("/oauth-app", status_code=204)
async def save_oauth_app_config(body: OAuthAppConfig, user: UserModel = Depends(get_user)):
    """Save Google OAuth app credentials for this org."""
    org_id = user.selected_organization_id
    client_secret = body.client_secret.strip()
    if client_secret == "<<keep>>":
        existing = await _config_client.get_configuration_value(
            org_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_OAUTH_APP.value
        )
        client_secret = (existing or {}).get("client_secret", "")
    await _config_client.upsert_configuration(
        org_id,
        OrganizationConfigurationKey.GOOGLE_CALENDAR_OAUTH_APP.value,
        {
            "client_id": body.client_id.strip(),
            "client_secret": client_secret,
            "redirect_uri": body.redirect_uri.strip(),
        },
    )


@router.get("/connect")
async def connect_google_calendar(user: UserModel = Depends(get_user)):
    """Redirect to Google OAuth consent screen."""
    org_id = user.selected_organization_id
    oauth_app = await gcal.get_oauth_app(org_id)
    if not oauth_app or not oauth_app.get("client_id"):
        raise HTTPException(
            status_code=400,
            detail="Google OAuth app not configured. Please enter your Client ID and Secret in settings first.",
        )
    state = f"{secrets.token_urlsafe(16)}:{org_id}"
    url = gcal.build_auth_url(state, oauth_app["client_id"], oauth_app["redirect_uri"])
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

    oauth_app = await gcal.get_oauth_app(organization_id)
    if not oauth_app:
        raise HTTPException(status_code=400, detail="OAuth app not configured for this organisation")

    try:
        tokens = await gcal.exchange_code_for_tokens(
            code,
            oauth_app["client_id"],
            oauth_app["client_secret"],
            oauth_app["redirect_uri"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    token_expiry = (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat()

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

    return RedirectResponse(f"{FRONTEND_BASE_URL}/settings?tab=integrations&calendar=connected")


@router.get("/status", response_model=CalendarStatus)
async def get_calendar_status(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    creds = await _config_client.get_configuration_value(
        org_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
    oauth_app = await gcal.get_oauth_app(org_id)
    connected = bool(creds and creds.get("access_token"))
    return CalendarStatus(
        connected=connected,
        calendar_id=creds.get("calendar_id") if connected else None,
        has_oauth_app=bool(oauth_app and oauth_app.get("client_id")),
    )


@router.delete("/disconnect", status_code=204)
async def disconnect_google_calendar(user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    await _config_client.delete_configuration(
        org_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
