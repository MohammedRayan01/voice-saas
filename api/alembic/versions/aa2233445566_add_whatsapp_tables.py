"""Add WhatsApp/CRM tables (wacrm integration)

Revision ID: aa2233445566
Revises: ff1122334455
Create Date: 2026-06-02 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "aa2233445566"
down_revision = "ff1122334455"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── tags ────────────────────────────────────────────────────────────────
    op.create_table(
        "wa_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default="#3b82f6"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_wa_tags_org", "wa_tags", ["organization_id"])

    # ── contacts extension — add WhatsApp fields (skip if already exist) ────
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(
        sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='contacts'")
    )}
    for col_name, col_def in [
        ("whatsapp_opt_in", sa.Column("whatsapp_opt_in", sa.Boolean(), nullable=False, server_default="true")),
        ("wa_last_seen", sa.Column("wa_last_seen", sa.DateTime(timezone=True), nullable=True)),
        ("wa_avatar_url", sa.Column("wa_avatar_url", sa.String(500), nullable=True)),
        ("company", sa.Column("company", sa.String(255), nullable=True)),
        ("email", sa.Column("email", sa.String(255), nullable=True)),
    ]:
        if col_name not in existing:
            op.add_column("contacts", col_def)

    # ── contact_tags ────────────────────────────────────────────────────────
    op.create_table(
        "contact_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tag_id", sa.Integer(), sa.ForeignKey("wa_tags.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("contact_id", "tag_id", name="uq_contact_tags"),
    )
    op.create_index("ix_contact_tags_contact", "contact_tags", ["contact_id"])
    op.create_index("ix_contact_tags_tag", "contact_tags", ["tag_id"])

    # ── contact_notes ───────────────────────────────────────────────────────
    op.create_table(
        "contact_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("note_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── whatsapp_config ─────────────────────────────────────────────────────
    op.create_table(
        "whatsapp_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("phone_number_id", sa.String(100), nullable=False),
        sa.Column("waba_id", sa.String(100), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("verify_token", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="disconnected"),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_whatsapp_config_org", "whatsapp_config", ["organization_id"])

    # ── message_templates ───────────────────────────────────────────────────
    op.create_table(
        "message_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="Marketing"),
        sa.Column("language", sa.String(20), nullable=False, server_default="en_US"),
        sa.Column("header_type", sa.String(20), nullable=True),
        sa.Column("header_content", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("footer_text", sa.Text(), nullable=True),
        sa.Column("buttons", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="Draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── conversations ───────────────────────────────────────────────────────
    op.create_table(
        "wa_conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("assigned_agent_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("last_message_text", sa.Text(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_wa_conversations_org_status", "wa_conversations", ["organization_id", "status"])
    op.create_index("ix_wa_conversations_org_updated", "wa_conversations", ["organization_id", "updated_at"])

    # ── messages ────────────────────────────────────────────────────────────
    op.create_table(
        "wa_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("wa_conversations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sender_type", sa.String(20), nullable=False),  # customer | agent | bot
        sa.Column("sender_id", sa.Integer(), nullable=True),
        sa.Column("content_type", sa.String(20), nullable=False, server_default="text"),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("media_url", sa.String(500), nullable=True),
        sa.Column("template_name", sa.String(200), nullable=True),
        sa.Column("wamid", sa.String(200), nullable=True, index=True),  # WhatsApp message ID
        sa.Column("status", sa.String(20), nullable=False, server_default="sent"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_wa_messages_conversation", "wa_messages", ["conversation_id", "created_at"])

    # ── pipelines ───────────────────────────────────────────────────────────
    op.create_table(
        "pipelines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "pipeline_stages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pipeline_id", sa.Integer(), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("color", sa.String(20), nullable=False, server_default="#3b82f6"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("pipeline_id", sa.Integer(), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("stage_id", sa.Integer(), sa.ForeignKey("pipeline_stages.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("wa_conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("value", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── broadcasts ──────────────────────────────────────────────────────────
    op.create_table(
        "wa_broadcasts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("template_name", sa.String(200), nullable=False),
        sa.Column("template_language", sa.String(20), nullable=False, server_default="en_US"),
        sa.Column("template_variables", postgresql.JSONB(), nullable=True),
        sa.Column("audience_filter", postgresql.JSONB(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("total_recipients", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delivered_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("read_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("replied_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "wa_broadcast_recipients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("broadcast_id", sa.Integer(), sa.ForeignKey("wa_broadcasts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("wamid", sa.String(200), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_wa_broadcast_recipients_broadcast", "wa_broadcast_recipients", ["broadcast_id"])

    # ── automations ─────────────────────────────────────────────────────────
    op.create_table(
        "wa_automations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("trigger_type", sa.String(50), nullable=False),
        sa.Column("trigger_config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("steps", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_wa_automations_org_active", "wa_automations", ["organization_id", "is_active"])


def downgrade() -> None:
    op.drop_table("wa_automations")
    op.drop_table("wa_broadcast_recipients")
    op.drop_table("wa_broadcasts")
    op.drop_table("deals")
    op.drop_table("pipeline_stages")
    op.drop_table("pipelines")
    op.drop_table("wa_messages")
    op.drop_table("wa_conversations")
    op.drop_table("message_templates")
    op.drop_table("whatsapp_config")
    op.drop_table("contact_notes")
    op.drop_table("contact_tags")
    op.drop_column("contacts", "email")
    op.drop_column("contacts", "company")
    op.drop_column("contacts", "wa_avatar_url")
    op.drop_column("contacts", "wa_last_seen")
    op.drop_column("contacts", "whatsapp_opt_in")
    op.drop_table("wa_tags")
