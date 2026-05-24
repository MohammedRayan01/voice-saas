from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import delete, func, select, update

from api.db.base_client import BaseDBClient
from api.db.models import ContactModel


class ContactClient(BaseDBClient):

    async def create_contact(self, organization_id: int, data: dict) -> ContactModel:
        async with self.async_session() as session:
            contact = ContactModel(
                organization_id=organization_id,
                **data,
            )
            session.add(contact)
            await session.commit()
            await session.refresh(contact)
            return contact

    async def get_contact(self, contact_id: int, organization_id: int) -> Optional[ContactModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(ContactModel).where(
                    ContactModel.id == contact_id,
                    ContactModel.organization_id == organization_id,
                )
            )
            return result.scalar_one_or_none()

    async def get_contact_by_phone(self, phone: str, organization_id: int) -> Optional[ContactModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(ContactModel).where(
                    ContactModel.phone == phone,
                    ContactModel.organization_id == organization_id,
                )
            )
            return result.scalar_one_or_none()

    async def list_contacts(
        self,
        organization_id: int,
        search: Optional[str] = None,
        tag: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[ContactModel], int]:
        async with self.async_session() as session:
            query = select(ContactModel).where(ContactModel.organization_id == organization_id)
            if search:
                pattern = f"%{search}%"
                from sqlalchemy import or_
                query = query.where(
                    or_(
                        ContactModel.first_name.ilike(pattern),
                        ContactModel.last_name.ilike(pattern),
                        ContactModel.email.ilike(pattern),
                        ContactModel.phone.ilike(pattern),
                        ContactModel.company.ilike(pattern),
                    )
                )
            if tag:
                query = query.where(ContactModel.tags.contains([tag]))

            count_result = await session.execute(
                select(func.count()).select_from(query.subquery())
            )
            total = count_result.scalar_one()

            query = query.order_by(ContactModel.created_at.desc()).offset(offset).limit(limit)
            result = await session.execute(query)
            return result.scalars().all(), total

    async def update_contact(self, contact_id: int, organization_id: int, data: dict) -> Optional[ContactModel]:
        async with self.async_session() as session:
            data["updated_at"] = datetime.now(UTC)
            await session.execute(
                update(ContactModel)
                .where(
                    ContactModel.id == contact_id,
                    ContactModel.organization_id == organization_id,
                )
                .values(**data)
            )
            await session.commit()
            result = await session.execute(
                select(ContactModel).where(ContactModel.id == contact_id)
            )
            return result.scalar_one_or_none()

    async def delete_contact(self, contact_id: int, organization_id: int) -> bool:
        async with self.async_session() as session:
            result = await session.execute(
                delete(ContactModel).where(
                    ContactModel.id == contact_id,
                    ContactModel.organization_id == organization_id,
                )
            )
            await session.commit()
            return result.rowcount > 0
