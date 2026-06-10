"""Add scheduled_automation_runs table for delay/drip automation steps

Revision ID: aa0011223344
Revises: ff1122334455
Create Date: 2026-06-10 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "aa0011223344"
down_revision = "ff1122334455"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scheduled_automation_runs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("automation_id", sa.Integer(), sa.ForeignKey("wa_automations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("phone_number", sa.String(50), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("context_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index(
        "ix_scheduled_automation_runs_org_status",
        "scheduled_automation_runs",
        ["organization_id", "status"],
    )
    op.create_index(
        "ix_scheduled_automation_runs_run_at",
        "scheduled_automation_runs",
        ["run_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_automation_runs_run_at", table_name="scheduled_automation_runs")
    op.drop_index("ix_scheduled_automation_runs_org_status", table_name="scheduled_automation_runs")
    op.drop_table("scheduled_automation_runs")
