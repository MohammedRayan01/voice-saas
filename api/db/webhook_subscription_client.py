from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.future import select

from api.db.base_client import BaseDBClient
from api.db.models import WebhookSubscriptionModel


class WebhookSubscriptionClient(BaseDBClient):
    async def list_webhook_subscriptions(self, organization_id: int) -> List[WebhookSubscriptionModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(WebhookSubscriptionModel)
                .where(WebhookSubscriptionModel.organization_id == organization_id)
                .order_by(WebhookSubscriptionModel.created_at)
            )
            return result.scalars().all()

    async def get_webhook_subscription(self, webhook_id: int, organization_id: int) -> Optional[WebhookSubscriptionModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(WebhookSubscriptionModel).where(
                    WebhookSubscriptionModel.id == webhook_id,
                    WebhookSubscriptionModel.organization_id == organization_id,
                )
            )
            return result.scalars().first()

    async def get_active_webhooks_for_event(self, organization_id: int, event: str) -> List[WebhookSubscriptionModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(WebhookSubscriptionModel).where(
                    WebhookSubscriptionModel.organization_id == organization_id,
                    WebhookSubscriptionModel.is_active.is_(True),
                )
            )
            all_rows = result.scalars().all()
            return [r for r in all_rows if event in (r.events or [])]

    async def create_webhook_subscription(
        self, organization_id: int, url: str, events: List[str],
        secret: Optional[str] = None, name: Optional[str] = None,
    ) -> WebhookSubscriptionModel:
        async with self.async_session() as session:
            row = WebhookSubscriptionModel(
                organization_id=organization_id,
                url=url, events=events, secret=secret, name=name,
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return row

    async def update_webhook_subscription(
        self, webhook_id: int, organization_id: int,
        url: Optional[str] = None, events: Optional[List[str]] = None,
        secret: Optional[str] = None, name: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[WebhookSubscriptionModel]:
        async with self.async_session() as session:
            result = await session.execute(
                select(WebhookSubscriptionModel).where(
                    WebhookSubscriptionModel.id == webhook_id,
                    WebhookSubscriptionModel.organization_id == organization_id,
                )
            )
            row = result.scalars().first()
            if not row:
                return None
            if url is not None: row.url = url
            if events is not None: row.events = events
            if secret is not None: row.secret = secret
            if name is not None: row.name = name
            if is_active is not None: row.is_active = is_active
            row.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(row)
            return row

    async def delete_webhook_subscription(self, webhook_id: int, organization_id: int) -> bool:
        async with self.async_session() as session:
            result = await session.execute(
                select(WebhookSubscriptionModel).where(
                    WebhookSubscriptionModel.id == webhook_id,
                    WebhookSubscriptionModel.organization_id == organization_id,
                )
            )
            row = result.scalars().first()
            if not row:
                return False
            await session.delete(row)
            await session.commit()
            return True
