"""
Per-second pricing for realtime audio models (e.g. Gemini Live).

These models handle STT + LLM + TTS in a single streaming session, so
token counts are unavailable. Cost is estimated from call duration instead.
"""

from decimal import Decimal

from api.services.configuration.registry import ServiceProviders

from .models import TimePricingModel

# Gemini Live audio pricing (per second of call duration).
# Google charges per audio token; we approximate using a combined per-second
# rate that covers both input and output audio at typical speaking rates.
# gemini-2.5-flash-live / gemini-3.x live: ~$0.016/min combined ≈ $0.00027/s
# gemini-3.1-flash-live-preview: $0.005/min audio input + $0.018/min audio output
# Both billed simultaneously during a call = $0.023/min = $0.000383/sec
_GEMINI_LIVE_DEFAULT = TimePricingModel(second_price=Decimal("0.000383"))

REALTIME_PRICING = {
    ServiceProviders.GOOGLE_REALTIME: {
        "default": _GEMINI_LIVE_DEFAULT,
        # Add model-specific overrides below if pricing differs:
        # "models/gemini-3.0-flash-live-001": TimePricingModel(...),
    }
}
