from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from api.db.base_client import BaseDBClient
from api.db.models import (
    APIKeyModel,
    OrganizationMemberModel,
    OrganizationModel,
    UserModel,
    organization_users_association,
)
from api.utils.api_key import generate_api_key


class OrganizationClient(BaseDBClient):
    async def get_organization_by_id(
        self, organization_id: int
    ) -> Optional[OrganizationModel]:
        """Get an organization by its ID."""
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationModel).where(OrganizationModel.id == organization_id)
            )
            return result.scalars().first()

    async def get_or_create_organization_by_provider_id(
        self, org_provider_id: str, user_id: int
    ) -> tuple[OrganizationModel, bool]:
        """Get an existing organization by provider_id or create a new one.

        Returns:
            A tuple of (organization, was_created) where was_created is True if the organization
            was created in this call, False if it already existed.
        """
        async with self.async_session() as session:
            # First try to get existing organization
            result = await session.execute(
                select(OrganizationModel).where(
                    OrganizationModel.provider_id == org_provider_id
                )
            )
            organization = result.scalars().first()

            if organization is None:
                # Use PostgreSQL's INSERT ... ON CONFLICT DO NOTHING
                # This is atomic and handles race conditions at the database level

                stmt = insert(OrganizationModel.__table__).values(
                    provider_id=org_provider_id, created_at=datetime.now(timezone.utc)
                )
                # ON CONFLICT DO NOTHING - if another request already inserted, this becomes a no-op
                stmt = stmt.on_conflict_do_nothing(index_elements=["provider_id"])

                result = await session.execute(stmt)
                await session.commit()

                # Check if we actually inserted (rowcount > 0) or if there was a conflict (rowcount == 0)
                was_created = result.rowcount > 0

                # Now fetch the organization (either the one we just created or the one that existed)
                result = await session.execute(
                    select(OrganizationModel).where(
                        OrganizationModel.provider_id == org_provider_id
                    )
                )
                organization = result.scalars().first()

                if organization is None:
                    # This should never happen, but handle it just in case
                    error_msg = f"Failed to create or fetch organization with provider_id {org_provider_id}"
                    raise ValueError(error_msg)

                # Only create API key if we actually created the organization
                if was_created:
                    # Create a default API key for the new organization
                    _, key_hash, key_prefix = generate_api_key()

                    api_key = APIKeyModel(
                        organization_id=organization.id,
                        name="Default API Key",
                        key_hash=key_hash,
                        key_prefix=key_prefix,
                        is_active=True,
                        created_by=user_id,
                    )
                    session.add(api_key)
                    await session.commit()

                await session.refresh(organization)
                return organization, was_created
            return organization, False

    async def add_user_to_organization(
        self, user_id: int, organization_id: int
    ) -> None:
        """Ensure that a user is linked to an organization (many-to-many).

        The association is created only if it does not already exist.
        Uses INSERT ... ON CONFLICT DO NOTHING to handle race conditions.
        """
        async with self.async_session() as session:
            # Use PostgreSQL's INSERT ... ON CONFLICT DO NOTHING
            # This handles race conditions at the database level

            stmt = insert(organization_users_association).values(
                user_id=user_id, organization_id=organization_id
            )
            # ON CONFLICT DO NOTHING - if another request already inserted, this becomes a no-op
            # The primary key constraint on (user_id, organization_id) will trigger the conflict
            stmt = stmt.on_conflict_do_nothing()

            await session.execute(stmt)
            await session.commit()

    # ------------------------------------------------------------------
    # Organization members (RBAC)
    # ------------------------------------------------------------------

    async def list_organization_members(
        self, organization_id: int
    ) -> List[OrganizationMemberModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationMemberModel)
                .options(selectinload(OrganizationMemberModel.user))
                .where(OrganizationMemberModel.organization_id == organization_id)
                .order_by(OrganizationMemberModel.created_at)
            )
            return result.scalars().all()

    async def get_organization_member(
        self, organization_id: int, user_id: int
    ) -> Optional[OrganizationMemberModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationMemberModel)
                .options(selectinload(OrganizationMemberModel.user))
                .where(
                    OrganizationMemberModel.organization_id == organization_id,
                    OrganizationMemberModel.user_id == user_id,
                )
            )
            return result.scalars().first()

    async def create_organization_member_invite(
        self,
        organization_id: int,
        invite_email: str,
        role: str,
        invited_by_user_id: int,
        invite_token: str,
    ) -> OrganizationMemberModel:
        async with self.async_session() as session:
            # Check if a user with this email already exists
            user_result = await session.execute(
                select(UserModel).where(UserModel.email == invite_email)
            )
            existing_user = user_result.scalars().first()

            member = OrganizationMemberModel(
                organization_id=organization_id,
                user_id=existing_user.id if existing_user else invited_by_user_id,
                role=role,
                invited_by_user_id=invited_by_user_id,
                invite_email=invite_email,
                invite_token=invite_token,
            )
            session.add(member)
            await session.commit()
            await session.refresh(member)

            # Eagerly load user relationship
            result = await session.execute(
                select(OrganizationMemberModel)
                .options(selectinload(OrganizationMemberModel.user))
                .where(OrganizationMemberModel.id == member.id)
            )
            return result.scalars().first()

    async def accept_organization_invite(
        self, invite_token: str, user_id: int
    ) -> Optional[OrganizationMemberModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationMemberModel).where(
                    OrganizationMemberModel.invite_token == invite_token,
                    OrganizationMemberModel.accepted_at.is_(None),
                )
            )
            member = result.scalars().first()
            if not member:
                return None
            member.user_id = user_id
            member.accepted_at = datetime.now(timezone.utc)
            member.invite_token = None
            await session.commit()
            await session.refresh(member)
            return member

    async def update_organization_member_role(
        self, organization_id: int, user_id: int, role: str
    ) -> Optional[OrganizationMemberModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationMemberModel)
                .options(selectinload(OrganizationMemberModel.user))
                .where(
                    OrganizationMemberModel.organization_id == organization_id,
                    OrganizationMemberModel.user_id == user_id,
                )
            )
            member = result.scalars().first()
            if not member:
                return None
            member.role = role
            await session.commit()
            await session.refresh(member)
            return member

    async def delete_organization_member(
        self, organization_id: int, user_id: int
    ) -> bool:
        async with self.async_session() as session:
            result = await session.execute(
                select(OrganizationMemberModel).where(
                    OrganizationMemberModel.organization_id == organization_id,
                    OrganizationMemberModel.user_id == user_id,
                )
            )
            member = result.scalars().first()
            if not member:
                return False
            await session.delete(member)
            await session.commit()
            return True
