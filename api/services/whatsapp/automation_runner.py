"""Run wa_automations for a given trigger + context.

Mirrors the logic in wacrm's engine.ts but in Python, calling
Lynq's own services directly instead of HTTP hops.
"""
from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger
from sqlalchemy import select, update

from api.db.base_client import BaseDBClient
from api.db.models import WaAutomationModel, WaConversationModel, WaMessageModel
from api.services.whatsapp import meta_client
from api.services.workflow.text_engine import text_engine

_db = BaseDBClient()


async def run_automations(
    org_id: int,
    trigger_type: str,
    context: dict,
) -> None:
    """Fetch active automations for trigger_type and execute their steps."""
    async with _db.async_session() as s:
        r = await s.execute(
            select(WaAutomationModel).where(
                WaAutomationModel.organization_id == org_id,
                WaAutomationModel.trigger_type == trigger_type,
                WaAutomationModel.is_active == True,
            )
        )
        automations = r.scalars().all()

    for automation in automations:
        try:
            await _run_automation(org_id, automation, context)
        except Exception as exc:
            logger.error(f"[automation] {automation.id} failed: {exc}")


async def _run_automation(org_id: int, automation: WaAutomationModel, context: dict) -> None:
    # Increment run counter
    async with _db.async_session() as s:
        await s.execute(
            update(WaAutomationModel)
            .where(WaAutomationModel.id == automation.id)
            .values(run_count=WaAutomationModel.run_count + 1)
        )
        await s.commit()

    for step in automation.steps:
        await _execute_step(org_id, step, context, automation)


async def _execute_step(
    org_id: int,
    step: dict,
    context: dict,
    automation: WaAutomationModel,
) -> None:
    step_type = step.get("step_type")
    cfg = step.get("step_config", {})
    conv_id = context.get("conversation_id")
    contact_id = context.get("contact_id")
    sender_phone = context.get("sender_phone", "")

    if step_type == "send_message":
        text = cfg.get("text", "")
        if text and sender_phone:
            result = await meta_client.send_text(org_id, sender_phone, text)
            wamid = result.get("messages", [{}])[0].get("id")
            if conv_id and wamid:
                await _store_outbound(conv_id, text, wamid)

    elif step_type == "send_template":
        await meta_client.send_template(
            org_id,
            sender_phone,
            cfg.get("template_name", ""),
            cfg.get("language", "en_US"),
        )

    elif step_type == "ai_reply":
        msg_text = context.get("message_text", "")
        if msg_text and sender_phone:
            result = await text_engine.run_turn(
                organization_id=org_id,
                phone=sender_phone,
                message=msg_text,
            )
            reply = result.get("reply", "")
            action = result.get("action", "reply")
            if reply:
                send_result = await meta_client.send_text(org_id, sender_phone, reply)
                wamid = send_result.get("messages", [{}])[0].get("id")
                if conv_id and wamid:
                    await _store_outbound(conv_id, reply, wamid)

            if action == "escalate" and conv_id:
                async with _db.async_session() as s:
                    await s.execute(
                        update(WaConversationModel)
                        .where(WaConversationModel.id == conv_id)
                        .values(assigned_agent_id=None, status="open")
                    )
                    await s.commit()

    elif step_type == "close_conversation":
        if conv_id:
            async with _db.async_session() as s:
                await s.execute(
                    update(WaConversationModel)
                    .where(WaConversationModel.id == conv_id)
                    .values(status="closed")
                )
                await s.commit()

    elif step_type == "add_tag":
        pass  # TODO: implement tag assignment

    elif step_type == "assign_conversation":
        pass  # TODO: implement agent assignment

    else:
        logger.debug(f"[automation] unknown step_type={step_type}, skipping")


async def _store_outbound(conv_id: int, text: str, wamid: str) -> None:
    from datetime import UTC, datetime
    async with _db.async_session() as s:
        s.add(WaMessageModel(
            conversation_id=conv_id,
            sender_type="bot",
            content_type="text",
            content_text=text,
            wamid=wamid,
            status="sent",
        ))
        await s.execute(
            update(WaConversationModel)
            .where(WaConversationModel.id == conv_id)
            .values(
                last_message_text=text,
                last_message_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
        await s.commit()
