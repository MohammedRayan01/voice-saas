"""Exotel telephony routes — answer URL and status callbacks."""

import json

from fastapi import APIRouter, Request
from loguru import logger
from pipecat.utils.run_context import set_current_run_id
from starlette.responses import HTMLResponse

from api.db import db_client
from api.services.telephony.factory import get_telephony_provider_for_run
from api.services.telephony.status_processor import (
    StatusCallbackRequest,
    _process_status_update,
)
from api.utils.common import get_backend_endpoints

router = APIRouter()


@router.post("/exotel-xml", include_in_schema=False)
async def handle_exotel_answer(
    workflow_id: int, user_id: int, workflow_run_id: int, organization_id: int
):
    """Answer URL called by Exotel when a call connects. Returns ExoML."""
    workflow_run = await db_client.get_workflow_run_by_id(workflow_run_id)
    provider = await get_telephony_provider_for_run(workflow_run, organization_id)

    response_content = await provider.get_webhook_response(
        workflow_id, user_id, workflow_run_id
    )
    return HTMLResponse(content=response_content, media_type="application/xml")


@router.post("/exotel/status-callback/{workflow_run_id}")
async def handle_exotel_status_callback(workflow_run_id: int, request: Request):
    """Status callback sent by Exotel at call state changes."""
    set_current_run_id(workflow_run_id)

    form_data = await request.form()
    callback_data = dict(form_data)

    logger.info(
        f"[run {workflow_run_id}] Exotel status callback: {json.dumps(callback_data)}"
    )

    workflow_run = await db_client.get_workflow_run_by_id(workflow_run_id)
    if not workflow_run:
        return {"status": "ignored", "reason": "workflow_run_not_found"}

    workflow = await db_client.get_workflow_by_id(workflow_run.workflow_id)
    if not workflow:
        return {"status": "ignored", "reason": "workflow_not_found"}

    provider = await get_telephony_provider_for_run(workflow_run, workflow.organization_id)
    parsed_data = provider.parse_status_callback(callback_data)

    await _process_status_update(
        workflow_run_id,
        StatusCallbackRequest(
            call_id=parsed_data["call_id"],
            status=parsed_data["status"],
            from_number=parsed_data.get("from_number"),
            to_number=parsed_data.get("to_number"),
            direction=parsed_data.get("direction"),
            duration=parsed_data.get("duration"),
            extra=parsed_data.get("extra", {}),
        ),
    )

    return {"status": "success"}
