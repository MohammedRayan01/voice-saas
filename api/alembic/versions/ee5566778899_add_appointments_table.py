"""Add appointments table

Revision ID: ee5566778899
Revises: dd4455667788
Create Date: 2026-05-26 01:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = "ee5566778899"
down_revision = "dd4455667788"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("appointment_uuid", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("workflow_run_id", sa.Integer(), nullable=True),
        sa.Column("google_event_id", sa.String(length=255), nullable=True),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("caller_name", sa.String(length=255), nullable=True),
        sa.Column("caller_number", sa.String(length=50), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_run_id"], ["workflow_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointments_id"), "appointments", ["id"], unique=False)
    op.create_index(op.f("ix_appointments_appointment_uuid"), "appointments", ["appointment_uuid"], unique=True)
    op.create_index(op.f("ix_appointments_organization_id"), "appointments", ["organization_id"], unique=False)
    op.create_index(op.f("ix_appointments_workflow_run_id"), "appointments", ["workflow_run_id"], unique=False)
    op.create_index(op.f("ix_appointments_google_event_id"), "appointments", ["google_event_id"], unique=False)
    op.create_index("ix_appointments_org_start", "appointments", ["organization_id", "start_time"], unique=False)
    op.create_index("ix_appointments_org_status", "appointments", ["organization_id", "status"], unique=False)


def downgrade():
    op.drop_index("ix_appointments_org_status", table_name="appointments")
    op.drop_index("ix_appointments_org_start", table_name="appointments")
    op.drop_index(op.f("ix_appointments_google_event_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_workflow_run_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_organization_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_appointment_uuid"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_id"), table_name="appointments")
    op.drop_table("appointments")
