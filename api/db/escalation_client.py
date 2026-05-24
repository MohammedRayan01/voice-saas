from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import select, update

from api.db.base_client import BaseDBClient
from api.db.models import EscalationModel


class EscalationClient(BaseDBClient):

    async def create_escalation(self, organization_id: int, query: str, workflow_run_id: Optional[int] = None) -> EscalationModel:
        async with self.async_session() as session:
            esc = EscalationModel(
                organization_id=organization_id,
                workflow_run_id=workflow_run_id,
                query=query,
                status="pending",
            )
            session.add(esc)
            await session.commit()
            await session.refresh(esc)
            return esc

    async def list_escalations(self, organization_id: int, status: Optional[str] = None) -> list[EscalationModel]:
        async with self.async_session() as session:
            q = select(EscalationModel).where(EscalationModel.organization_id == organization_id)
            if status:
                q = q.where(EscalationModel.status == status)
            q = q.order_by(EscalationModel.created_at.desc())
            result = await session.execute(q)
            return result.scalars().all()

    async def resolve_escalation(self, escalation_id: int, organization_id: int, answer: str, add_to_kb: bool) -> Optional[EscalationModel]:
        async with self.async_session() as session:
            await session.execute(
                update(EscalationModel)
                .where(EscalationModel.id == escalation_id, EscalationModel.organization_id == organization_id)
                .values(
                    answer=answer,
                    status="resolved",
                    add_to_kb=add_to_kb,
                    resolved_at=datetime.now(UTC),
                )
            )
            await session.commit()
            result = await session.execute(
                select(EscalationModel).where(EscalationModel.id == escalation_id)
            )
            return result.scalar_one_or_none()

    async def dismiss_escalation(self, escalation_id: int, organization_id: int) -> bool:
        async with self.async_session() as session:
            await session.execute(
                update(EscalationModel)
                .where(EscalationModel.id == escalation_id, EscalationModel.organization_id == organization_id)
                .values(status="dismissed")
            )
            await session.commit()
            return True
