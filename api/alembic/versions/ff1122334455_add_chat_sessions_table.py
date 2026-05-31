"""Add chat_sessions table for WhatsApp AI text engine

Revision ID: ff1122334455
Revises: ee5566778899
Create Date: 2026-05-31 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "ff1122334455"
down_revision = "ee5566778899"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("history", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_chat_sessions_org_phone", "chat_sessions", ["organization_id", "phone"]
    )
    op.create_unique_constraint(
        "uq_chat_sessions_org_phone", "chat_sessions", ["organization_id", "phone"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_chat_sessions_org_phone", "chat_sessions")
    op.drop_index("ix_chat_sessions_org_phone", "chat_sessions")
    op.drop_table("chat_sessions")
