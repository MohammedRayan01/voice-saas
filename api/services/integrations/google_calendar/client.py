"""Google Calendar service — manages OAuth tokens and calendar operations.

Uses httpx for all Google API calls. No Google SDK required.
Tokens and OAuth app credentials are stored per-org in OrganizationConfigurationModel.
"""
from datetime import UTC, datetime, timedelta
from typing import Optional

import httpx
from loguru import logger

from api.db.organization_configuration_client import OrganizationConfigurationClient
from api.enums import OrganizationConfigurationKey

SCOPES = "https://www.googleapis.com/auth/calendar"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"

_config_client = OrganizationConfigurationClient()


async def get_oauth_app(organization_id: int) -> Optional[dict]:
    """Return the org's Google OAuth app credentials, or None if not configured."""
    return await _config_client.get_configuration_value(
        organization_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_OAUTH_APP.value
    )


def build_auth_url(state: str, client_id: str, redirect_uri: str) -> str:
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{AUTH_URL}?{query}"


async def exchange_code_for_tokens(code: str, client_id: str, client_secret: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def _refresh_access_token(refresh_token: str, client_id: str, client_secret: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        return resp.json()


async def get_valid_token(organization_id: int) -> Optional[str]:
    """Return a valid access token for the org, refreshing if expired."""
    creds = await _config_client.get_configuration_value(
        organization_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
    if not creds:
        return None

    expiry = creds.get("token_expiry")
    if expiry:
        expiry_dt = datetime.fromisoformat(expiry)
        if datetime.now(UTC) >= expiry_dt - timedelta(seconds=60):
            oauth_app = await get_oauth_app(organization_id)
            if not oauth_app:
                logger.error(f"No OAuth app configured for org {organization_id}, cannot refresh token")
                return None
            try:
                refreshed = await _refresh_access_token(
                    creds["refresh_token"],
                    oauth_app["client_id"],
                    oauth_app["client_secret"],
                )
                creds["access_token"] = refreshed["access_token"]
                new_expiry = datetime.now(UTC) + timedelta(seconds=refreshed.get("expires_in", 3600))
                creds["token_expiry"] = new_expiry.isoformat()
                await _config_client.upsert_configuration(
                    organization_id,
                    OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value,
                    creds,
                )
            except Exception as e:
                logger.error(f"Google Calendar token refresh failed for org {organization_id}: {e}")
                return None

    return creds.get("access_token")


async def get_primary_calendar_id(access_token: str) -> Optional[str]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{CALENDAR_BASE}/users/me/calendarList/primary",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            return resp.json().get("id")
    return None


async def check_availability(
    organization_id: int,
    date_iso: str,
    duration_minutes: int = 30,
    timezone: str = "UTC",
) -> list[dict]:
    """Return available time slots on the given date."""
    token = await get_valid_token(organization_id)
    if not token:
        return []

    creds = await _config_client.get_configuration_value(
        organization_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
    calendar_id = creds.get("calendar_id", "primary")

    date = datetime.fromisoformat(date_iso)
    day_start = date.replace(hour=8, minute=0, second=0, microsecond=0)
    day_end = date.replace(hour=18, minute=0, second=0, microsecond=0)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CALENDAR_BASE}/freeBusy",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "timeMin": day_start.isoformat() + "Z",
                "timeMax": day_end.isoformat() + "Z",
                "timeZone": timezone,
                "items": [{"id": calendar_id}],
            },
        )
        if resp.status_code != 200:
            logger.error(f"Google freeBusy error: {resp.text}")
            return []

    busy_slots = resp.json().get("calendars", {}).get(calendar_id, {}).get("busy", [])
    busy_ranges = [(b["start"], b["end"]) for b in busy_slots]

    slots = []
    current = day_start
    while current + timedelta(minutes=duration_minutes) <= day_end:
        slot_end = current + timedelta(minutes=duration_minutes)
        slot_start_str = current.isoformat() + "Z"
        slot_end_str = slot_end.isoformat() + "Z"
        is_busy = any(
            not (slot_end_str <= b[0] or slot_start_str >= b[1])
            for b in busy_ranges
        )
        if not is_busy:
            slots.append({"start": slot_start_str, "end": slot_end_str})
        current += timedelta(minutes=duration_minutes)

    return slots


async def book_appointment(
    organization_id: int,
    start_iso: str,
    end_iso: str,
    summary: str,
    description: str = "",
    attendee_email: Optional[str] = None,
) -> Optional[dict]:
    """Create a calendar event and return event details."""
    token = await get_valid_token(organization_id)
    if not token:
        return None

    creds = await _config_client.get_configuration_value(
        organization_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
    calendar_id = creds.get("calendar_id", "primary")

    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_iso, "timeZone": "UTC"},
        "end": {"dateTime": end_iso, "timeZone": "UTC"},
    }
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CALENDAR_BASE}/calendars/{calendar_id}/events",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=event_body,
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Google Calendar book error: {resp.text}")
            return None
        data = resp.json()
        return {"event_id": data["id"], "summary": data["summary"], "start": start_iso, "end": end_iso}


async def cancel_appointment(organization_id: int, event_id: str) -> bool:
    """Delete a calendar event by event ID."""
    token = await get_valid_token(organization_id)
    if not token:
        return False

    creds = await _config_client.get_configuration_value(
        organization_id, OrganizationConfigurationKey.GOOGLE_CALENDAR_CREDENTIALS.value
    )
    calendar_id = creds.get("calendar_id", "primary")

    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{CALENDAR_BASE}/calendars/{calendar_id}/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.status_code in (200, 204)
