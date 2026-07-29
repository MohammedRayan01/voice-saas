"""
Execution helpers for non-LLM workflow nodes.

These utilities are called from two entry points:
  - pipecat_engine.py  : during-call nodes (condition, setVariable, data table, alertTeam)
  - run_integrations.py: post-call nodes  (alertTeam, waitDelay)

Keeping the logic here avoids duplicating the same code across both callers
and mirrors how the WhatsApp automation runner (`services/whatsapp/automation_runner.py`)
already centralises its step handlers.

Condition operators match the set defined in ConditionNodeData / dto.py and
the data-table query filter format used by routes/data_tables.py.
"""

from __future__ import annotations

import json
from typing import Any

from loguru import logger


# ─────────────────────────────────────────────────────────────────────────────
# Condition evaluation
# ─────────────────────────────────────────────────────────────────────────────


def evaluate_condition(
    field: str,
    operator: str,
    value: str,
    context: dict,
) -> bool:
    """Evaluate ``field operator value`` against the call's gathered context.

    Field resolution order:
    1. ``context["extracted_variables"][field]`` — variables written by the LLM
       extraction pass or by earlier setVariable nodes.
    2. ``context[field]`` — top-level keys such as ``call_disposition``.

    Operators mirror those in ``ConditionNodeData`` (dto.py):
      eq / neq / gt / gte / lt / lte / contains / is_true / is_false

    Returns ``True`` when the condition passes, ``False`` otherwise (including
    when the field is not present in context — absent ≠ empty string).
    """
    extracted = context.get("extracted_variables", {})
    actual = extracted.get(field)
    if actual is None:
        actual = context.get(field)

    if actual is None:
        logger.debug(
            f"[conditionNode] field '{field}' not found in context — condition fails"
        )
        return False

    try:
        if operator == "eq":
            return str(actual).lower() == str(value).lower()
        if operator == "neq":
            return str(actual).lower() != str(value).lower()
        if operator == "gt":
            return float(actual) > float(value)
        if operator == "gte":
            return float(actual) >= float(value)
        if operator == "lt":
            return float(actual) < float(value)
        if operator == "lte":
            return float(actual) <= float(value)
        if operator == "contains":
            return str(value).lower() in str(actual).lower()
        if operator == "is_true":
            return str(actual).lower() in ("true", "yes", "1")
        if operator == "is_false":
            return str(actual).lower() in ("false", "no", "0", "")
    except (TypeError, ValueError) as exc:
        logger.debug(
            f"[conditionNode] type error evaluating '{field}' {operator} '{value}': {exc}"
        )
        return False

    logger.warning(f"[conditionNode] unknown operator '{operator}'")
    return False


def pick_condition_edge(out_edges: list, passed: bool) -> str | None:
    """Return the target node ID for the given condition result.

    Convention (matches the canvas label the user types):
      True  branch → edge whose label is one of: true / yes / pass / matched
      False branch → edge whose label is one of: false / no / fail / else

    Fallback when no label matches:
      True  → first outgoing edge
      False → second outgoing edge (first if only one exists)

    This lets users freely name their edges while still supporting the
    common "true / false" convention without any magic strings in the spec.
    """
    TRUE_LABELS = {"true", "yes", "pass", "matched", "match"}
    FALSE_LABELS = {"false", "no", "fail", "unmatched", "else", "miss"}

    target_set = TRUE_LABELS if passed else FALSE_LABELS
    for edge in out_edges:
        if edge.label.lower().strip() in target_set:
            return edge.target

    # Positional fallback
    if passed and out_edges:
        return out_edges[0].target
    if not passed and len(out_edges) > 1:
        return out_edges[1].target
    if out_edges:
        return out_edges[0].target
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Data table operations
# ─────────────────────────────────────────────────────────────────────────────


async def query_data_table(
    org_id: int,
    table_name: str,
    filters: list[dict],
    limit: int,
) -> list[dict[str, Any]]:
    """Query rows from a named Data Table and return matching rows.

    Rows are filtered in Python after loading because data tables are
    typically small (< a few thousand rows) and the flexible JSON ``data``
    column does not support indexed SQL predicates.  This mirrors the
    in-memory filter strategy used by ``routes/data_tables.py``.

    Each returned dict includes an ``"id"`` key (the row primary key) so
    downstream nodes (e.g. updateDataTableNode) can reference specific rows.

    Args:
        org_id:     Organisation scoping — never query across org boundaries.
        table_name: Exact name of the OrgDataTableModel to query.
        filters:    List of ``{field, op, value}`` dicts (same format as the
                    Data Tables REST API query endpoint).
        limit:      Maximum number of rows to return (1–50).

    Returns:
        List of row dicts ``{"id": int, ...row.data fields...}``.
        Empty list if the table does not exist or no rows match.
    """
    from sqlalchemy import select

    from api.db import db_client
    from api.db.models import OrgDataRowModel, OrgDataTableModel
    from api.routes.data_tables import _row_matches_filters

    async with db_client.async_session() as session:
        result = await session.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.organization_id == org_id,
                OrgDataTableModel.name == table_name,
            )
        )
        table = result.scalar_one_or_none()
        if not table:
            logger.warning(
                f"[queryDataTable] table '{table_name}' not found for org {org_id}"
            )
            return []

        rows_result = await session.execute(
            select(OrgDataRowModel).where(OrgDataRowModel.table_id == table.id)
        )
        all_rows = rows_result.scalars().all()

    matching = [
        {"id": row.id, **row.data}
        for row in all_rows
        if _row_matches_filters(row.data, filters)
    ]
    logger.debug(
        f"[queryDataTable] '{table_name}': {len(matching)} of {len(all_rows)} rows matched"
    )
    return matching[:limit]


async def update_data_table_row(
    org_id: int,
    table_name: str,
    row_id: int,
    updates: dict,
) -> bool:
    """Merge ``updates`` into a Data Table row's ``data`` JSON column.

    Validates org ownership via the table's ``organization_id`` before
    writing — the row ID alone is not sufficient proof of ownership.

    Args:
        org_id:     Organisation that owns the table.
        table_name: Name of the table (used to verify ownership).
        row_id:     Primary key of the OrgDataRowModel to update.
        updates:    Dict of field → new value to merge into ``row.data``.
                    Values must already be rendered (template vars resolved).

    Returns:
        ``True`` on success, ``False`` if the table or row was not found.
    """
    from datetime import UTC, datetime

    from sqlalchemy import select

    from api.db import db_client
    from api.db.models import OrgDataRowModel, OrgDataTableModel

    async with db_client.async_session() as session:
        result = await session.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.organization_id == org_id,
                OrgDataTableModel.name == table_name,
            )
        )
        table = result.scalar_one_or_none()
        if not table:
            logger.warning(
                f"[updateDataTable] table '{table_name}' not found for org {org_id}"
            )
            return False

        row_result = await session.execute(
            select(OrgDataRowModel).where(
                OrgDataRowModel.id == row_id,
                OrgDataRowModel.table_id == table.id,
            )
        )
        row = row_result.scalar_one_or_none()
        if not row:
            logger.warning(
                f"[updateDataTable] row {row_id} not found in table '{table_name}'"
            )
            return False

        row.data = {**row.data, **updates}
        row.updated_at = datetime.now(UTC)
        await session.commit()
        logger.debug(
            f"[updateDataTable] updated row {row_id} in '{table_name}' "
            f"fields={list(updates.keys())}"
        )
        return True


# ─────────────────────────────────────────────────────────────────────────────
# Alert / notification dispatch
# ─────────────────────────────────────────────────────────────────────────────


async def send_alert(
    org_id: int,
    channel: str,
    recipient: str,
    message: str,
    subject: str | None = None,
) -> None:
    """Dispatch an alert to a team member via WhatsApp or email.

    Mirrors the ``alert_team`` step handler in
    ``services/whatsapp/automation_runner.py`` so both voice-call and
    WhatsApp-chat workflows share the same delivery path.

    Args:
        org_id:    Organisation context — required to look up the WhatsApp
                   phone-number config via ``meta_client.get_config()``.
        channel:   ``"whatsapp"`` or ``"email"``.
        recipient: Phone number (WhatsApp) or email address.
        message:   Pre-rendered alert body (template vars already resolved).
        subject:   Email subject line; ignored for WhatsApp alerts.
    """
    if channel == "whatsapp":
        from api.services.whatsapp import meta_client

        try:
            await meta_client.send_text(org_id, recipient, message)
            logger.info(f"[alertTeam] WhatsApp alert sent to {recipient}")
        except Exception as exc:
            logger.error(f"[alertTeam] WhatsApp send failed to {recipient}: {exc}")

    elif channel == "email":
        from api.services.whatsapp.automation_runner import _send_alert_email

        await _send_alert_email(recipient, message, subject or "Lynq Alert")

    else:
        logger.warning(f"[alertTeam] unknown channel '{channel}', skipping alert")
