"""Exotel implementation of the TelephonyProvider interface."""

import json
import random
from typing import TYPE_CHECKING, Any, Dict, List, Optional

import aiohttp
from fastapi import HTTPException
from loguru import logger

from api.db import db_client
from api.enums import WorkflowRunMode
from api.services.telephony.base import (
    CallInitiationResult,
    NormalizedInboundData,
    ProviderSyncResult,
    TelephonyProvider,
)
from api.utils.common import get_backend_endpoints
from api.utils.telephony_address import normalize_telephony_address

if TYPE_CHECKING:
    from fastapi import WebSocket


class ExotelProvider(TelephonyProvider):
    """Exotel implementation of TelephonyProvider.

    Uses Exotel's REST API for outbound calls and ExoML (XML) for
    inbound/webhook responses. Audio streaming uses Exotel Media Streams
    over WebSocket (PCM 8 kHz linear).
    """

    PROVIDER_NAME = WorkflowRunMode.EXOTEL.value
    WEBHOOK_ENDPOINT = "exotel-xml"

    def __init__(self, config: Dict[str, Any]):
        self.api_key = config.get("api_key")
        self.api_token = config.get("api_token")
        self.account_sid = config.get("account_sid")
        self.from_numbers = config.get("from_numbers", [])

        if isinstance(self.from_numbers, str):
            self.from_numbers = [self.from_numbers]

        # Exotel base URL — uses account SID in path, Basic auth with api_key:api_token
        self.base_url = f"https://api.exotel.in/v1/Accounts/{self.account_sid}"

    def validate_config(self) -> bool:
        return bool(self.api_key and self.api_token and self.account_sid and self.from_numbers)

    async def initiate_call(
        self,
        to_number: str,
        webhook_url: str,
        workflow_run_id: Optional[int] = None,
        from_number: Optional[str] = None,
        **kwargs: Any,
    ) -> CallInitiationResult:
        if not self.validate_config():
            raise ValueError("Exotel provider not properly configured")

        if from_number is None:
            from_number = random.choice(self.from_numbers)

        endpoint = f"{self.base_url}/Calls/connect.json"

        data = {
            "From": to_number,
            "To": to_number,
            "CallerId": from_number,
            "Url": webhook_url,
            "Method": "POST",
        }

        if workflow_run_id:
            backend_endpoint, _ = await get_backend_endpoints()
            data["StatusCallback"] = (
                f"{backend_endpoint}/api/v1/telephony/exotel/status-callback/{workflow_run_id}"
            )
            data["StatusCallbackMethod"] = "POST"

        data.update(kwargs)

        auth = aiohttp.BasicAuth(self.api_key, self.api_token)
        async with aiohttp.ClientSession() as session:
            async with session.post(endpoint, data=data, auth=auth) as response:
                response_text = await response.text()
                if response.status not in (200, 201):
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to initiate Exotel call: {response_text}",
                    )

                response_data = json.loads(response_text)
                call_data = response_data.get("Call", response_data)
                call_id = call_data.get("Sid") or call_data.get("CallSid")

                if not call_id:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Exotel response missing call SID: {response_data}",
                    )

                return CallInitiationResult(
                    call_id=call_id,
                    status=call_data.get("Status", "queued"),
                    caller_number=from_number,
                    provider_metadata={"call_sid": call_id},
                    raw_response=response_data,
                )

    async def get_call_status(self, call_id: str) -> Dict[str, Any]:
        if not self.validate_config():
            raise ValueError("Exotel provider not properly configured")

        endpoint = f"{self.base_url}/Calls/{call_id}.json"
        auth = aiohttp.BasicAuth(self.api_key, self.api_token)

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, auth=auth) as response:
                if response.status != 200:
                    error_data = await response.text()
                    raise Exception(f"Failed to get Exotel call status: {error_data}")
                return await response.json()

    async def get_available_phone_numbers(self) -> List[str]:
        return self.from_numbers

    async def get_webhook_response(
        self, workflow_id: int, user_id: int, workflow_run_id: int
    ) -> str:
        _, wss_backend_endpoint = await get_backend_endpoints()

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{wss_backend_endpoint}/api/v1/telephony/ws/{workflow_id}/{user_id}/{workflow_run_id}">
        </Stream>
    </Connect>
</Response>"""

    async def get_call_cost(self, call_id: str) -> Dict[str, Any]:
        endpoint = f"{self.base_url}/Calls/{call_id}.json"
        auth = aiohttp.BasicAuth(self.api_key, self.api_token)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(endpoint, auth=auth) as response:
                    if response.status != 200:
                        error_data = await response.text()
                        logger.error(f"Failed to get Exotel call cost: {error_data}")
                        return {"cost_usd": 0.0, "duration": 0, "status": "error"}

                    call_data = (await response.json()).get("Call", {})
                    duration = int(call_data.get("Duration", 0) or 0)

                    return {
                        "cost_usd": 0.0,  # Exotel bills in INR; cost tracking via dashboard
                        "duration": duration,
                        "status": call_data.get("Status", "unknown"),
                        "raw_response": call_data,
                    }
        except Exception as e:
            logger.error(f"Exception fetching Exotel call cost: {e}")
            return {"cost_usd": 0.0, "duration": 0, "status": "error", "error": str(e)}

    def parse_status_callback(self, data: Dict[str, Any]) -> Dict[str, Any]:
        status_map = {
            "in-progress": "answered",
            "ringing": "ringing",
            "completed": "completed",
            "busy": "busy",
            "no-answer": "no-answer",
            "canceled": "canceled",
            "failed": "failed",
        }
        call_status = (data.get("Status") or data.get("CallStatus") or "").lower()
        return {
            "call_id": data.get("CallSid", "") or data.get("Sid", ""),
            "status": status_map.get(call_status, call_status),
            "from_number": data.get("From"),
            "to_number": data.get("To"),
            "direction": data.get("Direction"),
            "duration": data.get("Duration"),
            "extra": data,
        }

    async def verify_webhook_signature(
        self,
        url: str,
        params: Dict[str, Any],
        signature: str,
        nonce: str = "",
    ) -> bool:
        # Exotel does not currently sign its webhooks — accept all.
        return True

    async def verify_inbound_signature(
        self,
        url: str,
        webhook_data: Dict[str, Any],
        headers: Dict[str, str],
        body: str = "",
    ) -> bool:
        return True

    async def start_inbound_stream(
        self,
        *,
        websocket_url: str,
        workflow_run_id: int,
        normalized_data,
        backend_endpoint: str,
    ):
        from fastapi import Response

        exo_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{websocket_url}">
        </Stream>
    </Connect>
</Response>"""
        return Response(content=exo_xml, media_type="application/xml")

    @staticmethod
    def generate_error_response(error_type: str, message: str) -> tuple:
        from fastapi import Response

        exo_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Sorry, there was an error processing your call. {message}</Say>
    <Hangup/>
</Response>"""
        return Response(content=exo_xml, media_type="application/xml")

    @staticmethod
    def generate_validation_error_response(error_type) -> tuple:
        from fastapi import Response
        from api.errors.telephony_errors import TELEPHONY_ERROR_MESSAGES, TelephonyError

        message = TELEPHONY_ERROR_MESSAGES.get(
            error_type, TELEPHONY_ERROR_MESSAGES[TelephonyError.GENERAL_AUTH_FAILED]
        )

        exo_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>{message}</Say>
    <Hangup/>
</Response>"""
        return Response(content=exo_xml, media_type="application/xml")

    @classmethod
    def can_handle_webhook(cls, webhook_data: Dict[str, Any], headers: Dict[str, str]) -> bool:
        # Exotel sends CallSid in its webhook payloads
        return "CallSid" in webhook_data and "AccountSid" in webhook_data

    @staticmethod
    def parse_inbound_webhook(webhook_data: Dict[str, Any]) -> NormalizedInboundData:
        from_raw = webhook_data.get("From", "")
        to_raw = webhook_data.get("To", "")
        return NormalizedInboundData(
            provider=ExotelProvider.PROVIDER_NAME,
            call_id=webhook_data.get("CallSid", "") or webhook_data.get("Sid", ""),
            from_number=normalize_telephony_address(from_raw).canonical if from_raw else "",
            to_number=normalize_telephony_address(to_raw).canonical if to_raw else "",
            direction=webhook_data.get("Direction", ""),
            call_status=webhook_data.get("Status", "") or webhook_data.get("CallStatus", ""),
            account_id=webhook_data.get("AccountSid"),
            raw_data=webhook_data,
        )

    @staticmethod
    def validate_account_id(config_data: dict, webhook_account_id: str) -> bool:
        if webhook_account_id:
            return config_data.get("account_sid") == webhook_account_id
        return bool(config_data.get("account_sid"))

    async def configure_inbound(
        self, address: str, webhook_url: Optional[str]
    ) -> ProviderSyncResult:
        # Exotel webhooks are configured in the Exotel dashboard per ExoPhone.
        # We return ok=True so the DB write completes; the operator sets the
        # answer URL in the Exotel console to point at our /exotel-xml endpoint.
        return ProviderSyncResult(ok=True)

    async def transfer_call(
        self,
        destination: str,
        transfer_id: str,
        conference_name: str,
        timeout: int = 30,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        raise NotImplementedError("Exotel provider does not support call transfers")

    def supports_transfers(self) -> bool:
        return False

    async def handle_websocket(
        self,
        websocket: "WebSocket",
        workflow_id: int,
        user_id: int,
        workflow_run_id: int,
    ) -> None:
        from api.services.pipecat.run_pipeline import run_pipeline_telephony

        first_msg = await websocket.receive_text()
        start_msg = json.loads(first_msg)

        if start_msg.get("event") != "connected":
            # Some versions send "start" as the first event
            if start_msg.get("event") != "start":
                logger.error(f"[Exotel] Unexpected first event: {start_msg.get('event')}")
                await websocket.close(code=4400, reason="Expected connected/start event")
                return

        # The second message should be the "start" event with stream metadata
        if start_msg.get("event") == "connected":
            second_msg = await websocket.receive_text()
            start_msg = json.loads(second_msg)

        stream_sid = start_msg.get("streamSid") or start_msg.get("start", {}).get("streamSid")
        call_sid = (
            start_msg.get("callSid")
            or start_msg.get("start", {}).get("callSid")
        )

        if not stream_sid:
            logger.error(f"[Exotel] Missing streamSid in start event: {start_msg}")
            await websocket.close(code=4400, reason="Missing streamSid")
            return

        workflow_run = await db_client.get_workflow_run(workflow_run_id)
        if workflow_run and workflow_run.gathered_context and not call_sid:
            call_sid = workflow_run.gathered_context.get("call_id")

        await run_pipeline_telephony(
            websocket,
            provider_name=self.PROVIDER_NAME,
            workflow_id=workflow_id,
            workflow_run_id=workflow_run_id,
            user_id=user_id,
            call_id=call_sid or stream_sid,
            transport_kwargs={"stream_sid": stream_sid, "call_sid": call_sid or ""},
        )
