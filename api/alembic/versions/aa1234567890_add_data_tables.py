"""Add org_data_tables and org_data_rows for universal workflow builder

Revision ID: aa1234567890
Revises: ff1122334455
Create Date: 2026-06-18 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "aa1234567890"
down_revision = "ff1122334455"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "org_data_tables",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("schema_json", sa.JSON(), nullable=False, server_default="[]"),
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
            nullable=False,
        ),
    )
    op.create_index("ix_org_data_tables_org_id", "org_data_tables", ["organization_id"])
    op.create_unique_constraint(
        "uq_org_data_tables_org_name", "org_data_tables", ["organization_id", "name"]
    )

    op.create_table(
        "org_data_rows",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "table_id",
            sa.Integer(),
            sa.ForeignKey("org_data_tables.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("data", sa.JSON(), nullable=False, server_default="{}"),
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
            nullable=False,
        ),
    )
    op.create_index("ix_org_data_rows_table_id", "org_data_rows", ["table_id"])
    op.create_index("ix_org_data_rows_org_id", "org_data_rows", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_org_data_rows_org_id", "org_data_rows")
    op.drop_index("ix_org_data_rows_table_id", "org_data_rows")
    op.drop_table("org_data_rows")

    op.drop_constraint("uq_org_data_tables_org_name", "org_data_tables")
    op.drop_index("ix_org_data_tables_org_id", "org_data_tables")
    op.drop_table("org_data_tables")
