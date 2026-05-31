"""WhatsApp / text-channel AI engine.

Handles one turn of a WhatsApp conversation:
  - Loads/creates the chat session from the DB.
  - Resolves the org's LLM credentials (same chain as the voice QA engine).
  - Calls the LLM with system prompt + conversation history + new message.
  - Persists the updated history.
  - Returns {"reply": str, "action": "reply"|"escalate"|"end"}.

The system prompt is stored in OrganizationConfigurationKey.WHATSAPP_SYSTEM_PROMPT.
If not set, a sensible default is used.
"""

from __future__ import annotations

import random
from datetime import UTC, datetime
from typing import Literal

from loguru import logger
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.db.base_client import BaseDBClient
from api.db.models import ChatSessionModel, OrganizationConfigurationModel, OrganizationMemberModel
from api.enums import OrganizationConfigurationKey

_MAX_HISTORY_TURNS = 20  # keeps token usage bounded (~40 messages stored)

_DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful AI assistant for this business. "
    "Answer customer questions clearly and concisely in the same language they write in. "
    "If the customer explicitly asks to speak to a human or needs help you cannot provide, "
    "respond helpfully then end your reply with the single word ESCALATE on its own line."
)

# Provider → OpenAI-compatible base_url map (empty = use OpenAI default)
_PROVIDER_BASE_URLS: dict[str, str] = {
    "google": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
}

_PROVIDER_DEFAULT_MODELS: dict[str, str] = {
    "google": "gemini-2.0-flash",
    "openai": "gpt-4.1-mini",
    "groq": "llama-3.3-70b-versatile",
    "openrouter": "meta-llama/llama-3.3-70b-instruct",
}


class TextEngineClient(BaseDBClient):
    """Processes one inbound WhatsApp message turn via an LLM."""

    async def run_turn(
        self,
        organization_id: int,
        phone: str,
        message: str,
    ) -> dict:
        """Run one AI reply turn.

        Returns:
            {"reply": str, "action": "reply"|"escalate"|"end"}
        """
        system_prompt = await self._get_system_prompt(organization_id)
        llm_cfg = await self._resolve_llm_config(organization_id)
        history = await self._load_history(organization_id, phone)

        history.append({"role": "user", "content": message})

        try:
            ai_text = await self._call_llm(system_prompt, history, llm_cfg)
        except Exception as exc:
            logger.error(f"[text_engine] LLM error org={organization_id}: {exc}")
            return {
                "reply": "I'm having trouble right now. Please try again shortly.",
                "action": "reply",
            }

        reply_text, action = self._parse_action(ai_text)
        history.append({"role": "assistant", "content": reply_text})

        # Trim to keep history bounded
        cap = _MAX_HISTORY_TURNS * 2
        if len(history) > cap:
            history = history[-cap:]

        await self._save_history(organization_id, phone, history)
        return {"reply": reply_text, "action": action}

    async def clear_session(self, organization_id: int, phone: str) -> None:
        await self._save_history(organization_id, phone, [])

    # ------------------------------------------------------------------ #
    # Private helpers                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_action(text: str) -> tuple[str, Literal["reply", "escalate", "end"]]:
        lines = text.strip().splitlines()
        if lines and lines[-1].strip().upper() == "ESCALATE":
            reply = "\n".join(lines[:-1]).strip() or "Let me connect you with our team."
            return reply, "escalate"
        return text.strip(), "reply"

    async def _get_system_prompt(self, organization_id: int) -> str:
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationConfigurationModel).where(
                    OrganizationConfigurationModel.organization_id == organization_id,
                    OrganizationConfigurationModel.key
                    == OrganizationConfigurationKey.WHATSAPP_SYSTEM_PROMPT.value,
                )
            )
            row = result.scalar_one_or_none()
        return (row.value if row and row.value else _DEFAULT_SYSTEM_PROMPT)

    async def _resolve_llm_config(self, organization_id: int) -> dict:
        """Return the first org member's LLM config dict."""
        from api.db import db_client as _db

        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationMemberModel.user_id).where(
                    OrganizationMemberModel.organization_id == organization_id
                ).limit(1)
            )
            row = result.scalar_one_or_none()

        if row is None:
            return {}

        try:
            user_cfg = await _db.get_user_configurations(row)
            return user_cfg.model_dump(exclude_none=True).get("llm", {})
        except Exception as exc:
            logger.warning(f"[text_engine] Could not resolve LLM config: {exc}")
            return {}

    async def _load_history(self, organization_id: int, phone: str) -> list[dict]:
        async with self.async_session() as session:
            result = await session.execute(
                select(ChatSessionModel).where(
                    ChatSessionModel.organization_id == organization_id,
                    ChatSessionModel.phone == phone,
                )
            )
            row = result.scalar_one_or_none()
        return list(row.history) if row else []

    async def _save_history(
        self, organization_id: int, phone: str, history: list[dict]
    ) -> None:
        now = datetime.now(UTC)
        async with self.async_session() as session:
            stmt = (
                pg_insert(ChatSessionModel)
                .values(
                    organization_id=organization_id,
                    phone=phone,
                    history=history,
                    created_at=now,
                    updated_at=now,
                )
                .on_conflict_do_update(
                    constraint="uq_chat_sessions_org_phone",
                    set_={"history": history, "updated_at": now},
                )
            )
            await session.execute(stmt)
            await session.commit()

    async def _call_llm(
        self, system_prompt: str, history: list[dict], llm_cfg: dict
    ) -> str:
        provider: str = llm_cfg.get("provider", "google")
        model: str = llm_cfg.get("model", "") or _PROVIDER_DEFAULT_MODELS.get(provider, "gemini-2.0-flash")
        api_key: str = llm_cfg.get("api_key", "") or ""
        if isinstance(api_key, list):
            api_key = random.choice(api_key)

        client_kwargs: dict = {"api_key": api_key or "placeholder"}

        base_url = _PROVIDER_BASE_URLS.get(provider)
        if base_url:
            # Allow user-configured override (e.g. for openrouter)
            client_kwargs["base_url"] = llm_cfg.get("base_url", base_url)
        elif provider == "azure":
            client_kwargs["base_url"] = llm_cfg.get("endpoint", "")

        client = AsyncOpenAI(**client_kwargs)
        messages = [{"role": "system", "content": system_prompt}] + history

        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=512,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""


# Module-level singleton
text_engine = TextEngineClient()
