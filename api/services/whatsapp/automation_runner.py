"""Run wa_automations for a given trigger + context.

Mirrors the logic in wacrm's engine.ts but in Python, calling
Lynq's own services directly instead of HTTP hops.
"""
from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any

from loguru import logger
from sqlalchemy import select, update

from api.db.base_client import BaseDBClient
from api.db.models import (
    ContactModel,
    ContactTagModel,
    DealModel,
    PipelineModel,
    PipelineStageModel,
    ScheduledAutomationRunModel,
    UserModel,
    WaAutomationModel,
    WaConversationModel,
    WaMessageModel,
    WaTagModel,
)
from api.enums import OrganizationConfigurationKey
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
    async with _db.async_session() as s:
        await s.execute(
            update(WaAutomationModel)
            .where(WaAutomationModel.id == automation.id)
            .values(run_count=WaAutomationModel.run_count + 1)
        )
        await s.commit()

    await _execute_steps_from(org_id, automation, context, step_index=0)


async def _execute_steps_from(
    org_id: int,
    automation: WaAutomationModel,
    context: dict,
    step_index: int = 0,
) -> None:
    """Execute automation steps starting from step_index. Stops at delay steps
    (schedules remainder) or at condition-false branches."""
    steps = automation.steps or []
    for idx in range(step_index, len(steps)):
        step = steps[idx]
        should_continue = await _execute_step(org_id, step, context, automation, current_index=idx)
        if not should_continue:
            # delay or condition-false — stop linear execution
            break


async def _execute_step(
    org_id: int,
    step: dict,
    context: dict,
    automation: WaAutomationModel,
    current_index: int = 0,
) -> bool:
    """Execute one step. Returns True to continue to next step, False to stop."""
    step_type = step.get("step_type")
    cfg = step.get("step_config", {})
    conv_id = context.get("conversation_id")
    contact_id = context.get("contact_id")
    sender_phone = context.get("sender_phone", "")

    if step_type == "send_message":
        text = _interpolate(cfg.get("text", ""), context)
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
        tag_name = _interpolate(cfg.get("tag", ""), context)
        if tag_name and contact_id:
            await _add_tag_to_contact(org_id, contact_id, tag_name)

    elif step_type == "assign_conversation":
        agent_email = _interpolate(cfg.get("agent_email", ""), context)
        if agent_email and conv_id:
            await _assign_conversation(org_id, conv_id, agent_email)

    elif step_type == "delay":
        # Schedule remainder of automation from the next step
        hours = cfg.get("hours", 0)
        days = cfg.get("days", 0)
        total_hours = hours + (days * 24)
        if total_hours > 0:
            run_at = datetime.now(UTC) + timedelta(hours=total_hours)
            await _schedule_step(
                org_id=org_id,
                automation_id=automation.id,
                phone_number=sender_phone,
                step_index=current_index + 1,
                context=context,
                run_at=run_at,
            )
        return False  # stop linear execution; remainder scheduled

    elif step_type == "condition":
        passed = _evaluate_condition(cfg, context)
        if not passed:
            return False  # stop on false branch

    elif step_type == "create_deal":
        pipeline_name = _interpolate(cfg.get("pipeline", ""), context)
        stage_name = _interpolate(cfg.get("stage", "New Inquiry"), context)
        deal_title = _interpolate(cfg.get("title", "New Lead"), context)
        if pipeline_name and contact_id:
            await _create_deal(org_id, contact_id, conv_id, pipeline_name, stage_name, deal_title)

    elif step_type == "update_contact":
        fields = cfg.get("fields", {})
        if contact_id and fields:
            resolved = {k: _interpolate(str(v), context) for k, v in fields.items()}
            await _update_contact_fields(org_id, contact_id, resolved)

    elif step_type == "send_voice_call":
        workflow_id = _interpolate(cfg.get("workflow_id", ""), context)
        if workflow_id and sender_phone:
            await _trigger_voice_call(org_id, sender_phone, workflow_id)

    else:
        logger.debug(f"[automation] unknown step_type={step_type}, skipping")

    return True  # continue to next step


# ── Helpers ────────────────────────────────────────────────────────────────────

def _interpolate(text: str, context: dict) -> str:
    """Replace {contact.x}, {config.x}, {collected.x} variables in text."""
    if not text or "{" not in text:
        return text

    def replacer(match: re.Match) -> str:
        path = match.group(1)
        parts = path.split(".")
        if parts[0] == "contact":
            contact = context.get("contact", {})
            if len(parts) == 2:
                return str(contact.get(parts[1], ""))
            elif len(parts) == 3 and parts[1] == "custom":
                return str(contact.get("custom_fields", {}).get(parts[2], ""))
        elif parts[0] == "config":
            config = context.get("org_config", {})
            return str(config.get(parts[1], "")) if len(parts) == 2 else ""
        elif parts[0] == "collected":
            collected = context.get("collected", {})
            return str(collected.get(parts[1], "")) if len(parts) == 2 else ""
        return match.group(0)  # leave unknown variables as-is

    return re.sub(r"\{([^}]+)\}", replacer, text)


def _evaluate_condition(cfg: dict, context: dict) -> bool:
    """Evaluate a condition step. Returns True if the automation should continue."""
    field_path = cfg.get("field", "")
    op = cfg.get("op", "eq")
    expected = cfg.get("value")

    # Resolve field value from context
    parts = field_path.split(".")
    actual = None
    if parts[0] == "contact":
        contact = context.get("contact", {})
        if len(parts) == 2:
            actual = contact.get(parts[1])
        elif len(parts) == 3 and parts[1] == "custom":
            actual = contact.get("custom_fields", {}).get(parts[2])
    elif parts[0] == "collected":
        actual = context.get("collected", {}).get(parts[1] if len(parts) > 1 else "")

    if actual is None:
        return False

    try:
        if op == "eq":
            return str(actual) == str(expected)
        elif op == "neq":
            return str(actual) != str(expected)
        elif op == "gte":
            return float(actual) >= float(expected)
        elif op == "lte":
            return float(actual) <= float(expected)
        elif op == "gt":
            return float(actual) > float(expected)
        elif op == "lt":
            return float(actual) < float(expected)
        elif op == "contains":
            return str(expected).lower() in str(actual).lower()
    except (TypeError, ValueError):
        return False

    return False


async def _add_tag_to_contact(org_id: int, contact_id: int, tag_name: str) -> None:
    async with _db.async_session() as s:
        # Find or create tag
        r = await s.execute(
            select(WaTagModel).where(
                WaTagModel.organization_id == org_id,
                WaTagModel.name == tag_name,
            )
        )
        tag = r.scalar_one_or_none()
        if not tag:
            tag = WaTagModel(organization_id=org_id, name=tag_name)
            s.add(tag)
            await s.flush()

        # Add tag to contact if not already present
        r2 = await s.execute(
            select(ContactTagModel).where(
                ContactTagModel.contact_id == contact_id,
                ContactTagModel.tag_id == tag.id,
            )
        )
        if not r2.scalar_one_or_none():
            s.add(ContactTagModel(contact_id=contact_id, tag_id=tag.id))

        await s.commit()


async def _assign_conversation(org_id: int, conv_id: int, agent_email: str) -> None:
    async with _db.async_session() as s:
        r = await s.execute(
            select(UserModel).where(UserModel.email == agent_email)
        )
        user = r.scalar_one_or_none()
        if user:
            await s.execute(
                update(WaConversationModel)
                .where(WaConversationModel.id == conv_id)
                .values(assigned_agent_id=user.id)
            )
            await s.commit()
        else:
            logger.warning(f"[automation] agent email {agent_email} not found for assignment")


async def _create_deal(
    org_id: int,
    contact_id: int,
    conv_id: int | None,
    pipeline_name: str,
    stage_name: str,
    deal_title: str,
) -> None:
    async with _db.async_session() as s:
        r = await s.execute(
            select(PipelineModel).where(
                PipelineModel.organization_id == org_id,
                PipelineModel.name == pipeline_name,
            )
        )
        pipeline = r.scalar_one_or_none()
        if not pipeline:
            logger.warning(f"[automation] pipeline '{pipeline_name}' not found for org {org_id}")
            return

        r2 = await s.execute(
            select(PipelineStageModel).where(
                PipelineStageModel.pipeline_id == pipeline.id,
                PipelineStageModel.name == stage_name,
            )
        )
        stage = r2.scalar_one_or_none()
        if not stage:
            # Use first stage if named stage not found
            r3 = await s.execute(
                select(PipelineStageModel)
                .where(PipelineStageModel.pipeline_id == pipeline.id)
                .order_by(PipelineStageModel.position)
                .limit(1)
            )
            stage = r3.scalar_one_or_none()

        if not stage:
            logger.warning(f"[automation] no stages found in pipeline {pipeline.id}")
            return

        deal = DealModel(
            organization_id=org_id,
            pipeline_id=pipeline.id,
            stage_id=stage.id,
            contact_id=contact_id,
            conversation_id=conv_id,
            title=deal_title,
        )
        s.add(deal)
        await s.commit()


async def _update_contact_fields(org_id: int, contact_id: int, fields: dict) -> None:
    """Merge fields into contact.custom_fields (or top-level fields for known keys)."""
    top_level_keys = {"first_name", "last_name", "email", "company", "job_title", "notes"}
    async with _db.async_session() as s:
        r = await s.execute(
            select(ContactModel).where(
                ContactModel.id == contact_id,
                ContactModel.organization_id == org_id,
            )
        )
        contact = r.scalar_one_or_none()
        if not contact:
            return

        custom = dict(contact.custom_fields or {})
        for k, v in fields.items():
            if k in top_level_keys:
                setattr(contact, k, v)
            else:
                custom[k] = v

        contact.custom_fields = custom
        contact.updated_at = datetime.now(UTC)
        await s.commit()


async def _trigger_voice_call(org_id: int, phone: str, workflow_id: str) -> None:
    """Trigger an outbound voice call via Lynq's campaign/outbound system.

    Requires a campaign with the target workflow. Logs a warning if the
    telephony outbound integration is not yet wired.
    """
    try:
        # Dynamically import to avoid hard dependency at module load time
        from api.services.telephony.outbound_caller import initiate_outbound_call  # type: ignore[import]
        await initiate_outbound_call(org_id=org_id, phone_number=phone, workflow_id=workflow_id)
    except ImportError:
        logger.warning(f"[automation] send_voice_call: outbound_caller not available (step skipped for {phone})")
    except Exception as exc:
        logger.error(f"[automation] send_voice_call failed for {phone}: {exc}")


async def _schedule_step(
    org_id: int,
    automation_id: int,
    phone_number: str,
    step_index: int,
    context: dict,
    run_at: datetime,
) -> None:
    """Persist a ScheduledAutomationRunModel and enqueue an ARQ deferred job."""
    from api.tasks.arq import enqueue_job

    async with _db.async_session() as s:
        run = ScheduledAutomationRunModel(
            organization_id=org_id,
            automation_id=automation_id,
            phone_number=phone_number,
            step_index=step_index,
            context_json=context,
            run_at=run_at,
            status="pending",
        )
        s.add(run)
        await s.commit()
        await s.refresh(run)
        run_id = run.id

    # Enqueue as deferred ARQ job
    from api.tasks.function_names import FunctionNames
    redis = await _get_arq_redis()
    await redis.enqueue_job(
        FunctionNames.EXECUTE_DELAYED_AUTOMATION_STEP,
        run_id,
        _defer_until=run_at,
    )


async def _get_arq_redis():
    from api.tasks.arq import get_arq_redis
    return await get_arq_redis()


async def _store_outbound(conv_id: int, text: str, wamid: str) -> None:
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
