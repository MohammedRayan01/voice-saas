"""WhatsApp / text-channel AI engine.

Handles one turn of a WhatsApp conversation:
  - Loads/creates the chat session from the DB.
  - Resolves the org's LLM credentials (same chain as the voice QA engine).
  - Calls the LLM with system prompt + conversation history + new message.
  - Supports OpenAI function-calling: KB search, calendar, save_lead_data.
  - Persists the updated history.
  - Returns {"reply": str, "action": "reply"|"escalate"|"end"}.

The system prompt is stored in OrganizationConfigurationKey.WHATSAPP_SYSTEM_PROMPT.
If not set, a sensible default is used.
"""

from __future__ import annotations

import json
import random
from datetime import UTC, datetime
from typing import Any, Literal

from loguru import logger
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.db.base_client import BaseDBClient
from api.db.models import ChatSessionModel, OrganizationConfigurationModel, OrganizationMemberModel
from api.enums import OrganizationConfigurationKey

_MAX_HISTORY_TURNS = 20  # keeps token usage bounded (~40 messages stored)
_MAX_TOOL_ROUNDS = 5  # prevent infinite tool-call loops

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

# Tool schemas exposed to the LLM
_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the business knowledge base for product info, FAQs, policies, or any stored information. Use this before answering factual questions about the business.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The question or topic to search for",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Check available appointment slots on a given date (Google Calendar). Use when a customer wants to book an appointment, site visit, or meeting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "ISO 8601 date string (YYYY-MM-DD) to check availability for",
                    },
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Duration of the appointment in minutes (default: 60)",
                        "default": 60,
                    },
                },
                "required": ["date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment on Google Calendar. Only call after confirming a time slot is available and the customer has agreed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_time": {
                        "type": "string",
                        "description": "ISO 8601 datetime for appointment start (e.g. 2025-06-15T10:00:00)",
                    },
                    "end_time": {
                        "type": "string",
                        "description": "ISO 8601 datetime for appointment end",
                    },
                    "summary": {
                        "type": "string",
                        "description": "Brief title for the appointment (e.g. 'Property Site Visit - Rahul Sharma')",
                    },
                    "guest_name": {"type": "string", "description": "Customer's full name"},
                    "guest_phone": {"type": "string", "description": "Customer's phone number"},
                },
                "required": ["start_time", "end_time", "summary", "guest_name", "guest_phone"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_lead_data",
            "description": "Save collected lead information to the CRM contact record. Call this when you have gathered important customer details like budget, requirements, or preferences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fields": {
                        "type": "object",
                        "description": "Key-value pairs of lead data to save (e.g. {\"budget\": \"50L\", \"bedrooms\": \"3\", \"location\": \"Bandra\"})",
                    }
                },
                "required": ["fields"],
            },
        },
    },
]


class TextEngineClient(BaseDBClient):
    """Processes one inbound WhatsApp message turn via an LLM, with tool-calling support."""

    async def run_turn(
        self,
        organization_id: int,
        phone: str,
        message: str,
        contact_id: int | None = None,
    ) -> dict:
        """Run one AI reply turn.

        Returns:
            {"reply": str, "action": "reply"|"escalate"|"end", "tool_results": list}
        """
        system_prompt = await self._get_system_prompt(organization_id)
        llm_cfg = await self._resolve_llm_config(organization_id)
        history = await self._load_history(organization_id, phone)

        history.append({"role": "user", "content": message})

        try:
            reply_text, action, tool_results = await self._call_llm_with_tools(
                system_prompt=system_prompt,
                history=history,
                llm_cfg=llm_cfg,
                organization_id=organization_id,
                phone=phone,
                contact_id=contact_id,
            )
        except Exception as exc:
            logger.error(f"[text_engine] LLM error org={organization_id}: {exc}")
            return {
                "reply": "I'm having trouble right now. Please try again shortly.",
                "action": "reply",
                "tool_results": [],
            }

        history.append({"role": "assistant", "content": reply_text})

        # Trim to keep history bounded
        cap = _MAX_HISTORY_TURNS * 2
        if len(history) > cap:
            history = history[-cap:]

        await self._save_history(organization_id, phone, history)
        return {"reply": reply_text, "action": action, "tool_results": tool_results}

    async def clear_session(self, organization_id: int, phone: str) -> None:
        await self._save_history(organization_id, phone, [])

    # ------------------------------------------------------------------ #
    # Tool-calling loop                                                    #
    # ------------------------------------------------------------------ #

    async def _call_llm_with_tools(
        self,
        system_prompt: str,
        history: list[dict],
        llm_cfg: dict,
        organization_id: int,
        phone: str,
        contact_id: int | None,
    ) -> tuple[str, Literal["reply", "escalate", "end"], list[dict]]:
        """Run LLM with tool-calling loop. Returns (reply, action, tool_results)."""
        client = self._build_client(llm_cfg)
        model = self._resolve_model(llm_cfg)
        messages = [{"role": "system", "content": system_prompt}] + history

        tool_results: list[dict] = []

        for _ in range(_MAX_TOOL_ROUNDS):
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=_TOOL_SCHEMAS,
                tool_choice="auto",
                max_tokens=1024,
                temperature=0.7,
            )

            choice = response.choices[0]
            finish_reason = choice.finish_reason

            if finish_reason == "tool_calls":
                # Execute each tool call and append results
                assistant_msg: dict[str, Any] = {
                    "role": "assistant",
                    "content": choice.message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in (choice.message.tool_calls or [])
                    ],
                }
                messages.append(assistant_msg)

                for tc in choice.message.tool_calls or []:
                    try:
                        args = json.loads(tc.function.arguments)
                        result = await self._execute_tool(
                            tc.function.name, args, organization_id, contact_id
                        )
                    except Exception as exc:
                        result = {"error": str(exc)}

                    tool_results.append({"tool": tc.function.name, "result": result})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    })
                continue  # go back for LLM's next response

            # Normal text response
            text = choice.message.content or ""
            reply_text, action = self._parse_action(text)
            return reply_text, action, tool_results

        # Fallback if we exhausted tool rounds
        return "I'm processing your request. Please hold on.", "reply", tool_results

    async def _execute_tool(
        self,
        name: str,
        args: dict,
        organization_id: int,
        contact_id: int | None,
    ) -> Any:
        """Dispatch a tool call to the appropriate handler."""
        if name == "search_knowledge_base":
            return await self._tool_search_kb(args["query"], organization_id)

        elif name == "check_availability":
            return await self._tool_check_availability(
                args["date"], args.get("duration_minutes", 60), organization_id
            )

        elif name == "book_appointment":
            return await self._tool_book_appointment(args, organization_id)

        elif name == "save_lead_data":
            return await self._tool_save_lead_data(
                args["fields"], organization_id, contact_id
            )

        return {"error": f"Unknown tool: {name}"}

    async def _tool_search_kb(self, query: str, organization_id: int) -> dict:
        try:
            from api.services.workflow.tools.knowledge_base import retrieve_from_knowledge_base
            result = await retrieve_from_knowledge_base(
                query=query,
                organization_id=organization_id,
                limit=3,
            )
            chunks = result.get("chunks", [])
            return {
                "results": [{"text": c.get("text", c.get("content", "")), "score": c.get("score", 0)} for c in chunks],
                "total": len(chunks),
            }
        except Exception as exc:
            logger.warning(f"[text_engine] KB search failed: {exc}")
            return {"results": [], "total": 0, "error": str(exc)}

    async def _tool_check_availability(
        self, date: str, duration_minutes: int, organization_id: int
    ) -> dict:
        try:
            from api.services.integrations.google_calendar.client import check_availability
            slots = await check_availability(
                organization_id=organization_id,
                date_iso=date,
                duration_minutes=duration_minutes,
            )
            return {"slots": slots, "date": date}
        except Exception as exc:
            logger.warning(f"[text_engine] check_availability failed: {exc}")
            return {"slots": [], "error": str(exc)}

    async def _tool_book_appointment(self, args: dict, organization_id: int) -> dict:
        try:
            from api.services.integrations.google_calendar.client import book_appointment
            event_id = await book_appointment(
                organization_id=organization_id,
                start_iso=args["start_time"],
                end_iso=args["end_time"],
                summary=args["summary"],
                description=f"Guest: {args.get('guest_name', '')} | Phone: {args.get('guest_phone', '')}",
            )
            return {"event_id": event_id, "status": "booked"}
        except Exception as exc:
            logger.warning(f"[text_engine] book_appointment failed: {exc}")
            return {"status": "failed", "error": str(exc)}

    async def _tool_save_lead_data(
        self, fields: dict, organization_id: int, contact_id: int | None
    ) -> dict:
        if not contact_id:
            return {"saved": False, "reason": "no contact_id in context"}
        try:
            from api.db.models import ContactModel
            from sqlalchemy import select
            from datetime import UTC, datetime
            async with self.async_session() as s:
                r = await s.execute(
                    select(ContactModel).where(
                        ContactModel.id == contact_id,
                        ContactModel.organization_id == organization_id,
                    )
                )
                contact = r.scalar_one_or_none()
                if not contact:
                    return {"saved": False, "reason": "contact not found"}

                custom = dict(contact.custom_fields or {})
                custom.update(fields)
                contact.custom_fields = custom
                contact.updated_at = datetime.now(UTC)
                await s.commit()

            return {"saved": True, "fields": list(fields.keys())}
        except Exception as exc:
            logger.warning(f"[text_engine] save_lead_data failed: {exc}")
            return {"saved": False, "error": str(exc)}

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

    def _build_client(self, llm_cfg: dict) -> AsyncOpenAI:
        provider: str = llm_cfg.get("provider", "google")
        api_key: str = llm_cfg.get("api_key", "") or ""
        if isinstance(api_key, list):
            api_key = random.choice(api_key)

        client_kwargs: dict = {"api_key": api_key or "placeholder"}
        base_url = _PROVIDER_BASE_URLS.get(provider)
        if base_url:
            client_kwargs["base_url"] = llm_cfg.get("base_url", base_url)
        elif provider == "azure":
            client_kwargs["base_url"] = llm_cfg.get("endpoint", "")

        return AsyncOpenAI(**client_kwargs)

    def _resolve_model(self, llm_cfg: dict) -> str:
        provider: str = llm_cfg.get("provider", "google")
        return llm_cfg.get("model", "") or _PROVIDER_DEFAULT_MODELS.get(provider, "gemini-2.0-flash")

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
        """Legacy non-tool call path — kept for backward compatibility."""
        client = self._build_client(llm_cfg)
        model = self._resolve_model(llm_cfg)
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
