"""Add escalations table

Revision ID: dd4455667788
Revises: cc3344556677
Create Date: 2026-05-24 01:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = "dd4455667788"
down_revision = "cc3344556677"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "escalations",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workflow_run_id", sa.Integer(), sa.ForeignKey("workflow_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("add_to_kb", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_escalations_id", "escalations", ["id"])
    op.create_index("ix_escalations_organization_id", "escalations", ["organization_id"])
    op.create_index("ix_escalations_workflow_run_id", "escalations", ["workflow_run_id"])
    op.create_index("ix_escalations_org_status", "escalations", ["organization_id", "status"])


def downgrade():
    op.drop_table("escalations")
