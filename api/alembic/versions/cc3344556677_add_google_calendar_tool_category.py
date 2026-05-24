"""Add google_calendar to tool_category enum

Revision ID: cc3344556677
Revises: bb2233445566
Create Date: 2026-05-24 00:01:00.000000
"""
from alembic import op

revision = "cc3344556677"
down_revision = "bb2233445566"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE tool_category ADD VALUE IF NOT EXISTS 'google_calendar'")


def downgrade():
    # PostgreSQL doesn't support removing enum values; downgrade is a no-op
    pass
