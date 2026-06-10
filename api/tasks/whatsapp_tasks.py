"""Background tasks for WhatsApp automation — delay/drip step execution."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from loguru import logger
from sqlalchemy import select, update

from api.db.base_client import BaseDBClient
from api.db.models import ScheduledAutomationRunModel, WaAutomationModel

_db = BaseDBClient()


async def execute_delayed_automation_step(ctx: dict, scheduled_run_id: int) -> None:
    """Execute a single automation step that was deferred via a delay step.

    Called by ARQ when run_at time arrives. Marks the scheduled run as running,
    executes the target step (and all subsequent non-delay steps), then marks done.
    """
    async with _db.async_session() as s:
        r = await s.execute(
            select(ScheduledAutomationRunModel).where(
                ScheduledAutomationRunModel.id == scheduled_run_id,
                ScheduledAutomationRunModel.status == "pending",
            )
        )
        run = r.scalar_one_or_none()
        if run is None:
            logger.warning(f"[whatsapp_tasks] scheduled_run {scheduled_run_id} not found or already processed")
            return

        await s.execute(
            update(ScheduledAutomationRunModel)
            .where(ScheduledAutomationRunModel.id == scheduled_run_id)
            .values(status="running", updated_at=datetime.now(UTC))
        )
        await s.commit()

        org_id = run.organization_id
        automation_id = run.automation_id
        step_index = run.step_index
        context = run.context_json or {}

    try:
        async with _db.async_session() as s:
            r = await s.execute(
                select(WaAutomationModel).where(
                    WaAutomationModel.id == automation_id,
                    WaAutomationModel.is_active == True,
                )
            )
            automation = r.scalar_one_or_none()

        if automation is None:
            logger.warning(f"[whatsapp_tasks] automation {automation_id} not found or inactive, skipping")
            await _mark_run(scheduled_run_id, "done")
            return

        # Import here to avoid circular imports
        from api.services.whatsapp.automation_runner import _execute_steps_from

        await _execute_steps_from(org_id, automation, context, step_index)

        await _mark_run(scheduled_run_id, "done")
        logger.info(f"[whatsapp_tasks] scheduled_run {scheduled_run_id} completed (automation={automation_id}, step={step_index})")

    except Exception as exc:
        logger.error(f"[whatsapp_tasks] scheduled_run {scheduled_run_id} failed: {exc}")
        await _mark_run(scheduled_run_id, "failed")
        raise


async def _mark_run(scheduled_run_id: int, status: str) -> None:
    async with _db.async_session() as s:
        await s.execute(
            update(ScheduledAutomationRunModel)
            .where(ScheduledAutomationRunModel.id == scheduled_run_id)
            .values(status=status, updated_at=datetime.now(UTC))
        )
        await s.commit()
