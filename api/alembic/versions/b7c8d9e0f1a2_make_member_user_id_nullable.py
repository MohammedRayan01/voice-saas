"""make organization_members.user_id nullable for pending invites

Pending invites have no user yet — user_id is only known once the invite
is accepted. The previous NOT NULL constraint forced invites to borrow the
inviter's user_id, which collides with uq_org_members_org_user as soon as
a second invite (or the inviter's own membership row) exists.

Revision ID: b7c8d9e0f1a2
Revises: cdcf9f65913b
Create Date: 2026-07-18

"""

from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "cdcf9f65913b"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.alter_column(
        "organization_members",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    # Detach pending invites from the borrowed inviter user_id so they no
    # longer collide with the inviter's own membership row.
    op.execute(
        "UPDATE organization_members SET user_id = NULL "
        "WHERE accepted_at IS NULL AND invite_token IS NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM organization_members WHERE user_id IS NULL"
    )
    op.alter_column(
        "organization_members",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
