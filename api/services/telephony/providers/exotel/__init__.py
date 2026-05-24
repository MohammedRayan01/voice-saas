"""Exotel telephony provider package."""

from typing import Any, Dict

from api.services.telephony.registry import (
    ProviderSpec,
    ProviderUIField,
    ProviderUIMetadata,
    register,
)

from .config import ExotelConfigurationRequest, ExotelConfigurationResponse
from .provider import ExotelProvider
from .transport import create_transport


def _config_loader(value: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "provider": "exotel",
        "api_key": value.get("api_key"),
        "api_token": value.get("api_token"),
        "account_sid": value.get("account_sid"),
        "from_numbers": value.get("from_numbers", []),
    }


_UI_METADATA = ProviderUIMetadata(
    display_name="Exotel",
    docs_url="https://support.exotel.com/support/solutions/articles/3000108630",
    fields=[
        ProviderUIField(
            name="api_key",
            label="API Key",
            type="text",
            sensitive=True,
            description="Exotel API Key (from your Exotel dashboard)",
        ),
        ProviderUIField(
            name="api_token",
            label="API Token",
            type="password",
            sensitive=True,
            description="Exotel API Token",
        ),
        ProviderUIField(
            name="account_sid",
            label="Account SID",
            type="text",
            sensitive=True,
            description="Your Exotel Account SID",
        ),
        ProviderUIField(
            name="from_numbers",
            label="ExoPhone Numbers",
            type="string-array",
            description="E.164-formatted Exotel virtual numbers (ExoPhones) for outbound calls",
        ),
    ],
)


SPEC = ProviderSpec(
    name="exotel",
    provider_cls=ExotelProvider,
    config_loader=_config_loader,
    transport_factory=create_transport,
    transport_sample_rate=8000,
    config_request_cls=ExotelConfigurationRequest,
    config_response_cls=ExotelConfigurationResponse,
    ui_metadata=_UI_METADATA,
    account_id_credential_field="account_sid",
)

register(SPEC)

__all__ = [
    "SPEC",
    "ExotelConfigurationRequest",
    "ExotelConfigurationResponse",
    "ExotelProvider",
    "create_transport",
]
