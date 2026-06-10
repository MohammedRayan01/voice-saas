"""Abstract base class for industry packs.

Each industry pack defines:
- wizard_schema: JSON Schema describing the multi-step wizard form
- system_prompt_template(): generates the AI system prompt from wizard config
- install(): creates all DB records (automations, pipeline, config)
- uninstall(): removes pack-created records
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class IndustryPack(ABC):
    """Abstract base for industry packs installed by PackInstaller."""

    @property
    @abstractmethod
    def pack_id(self) -> str:
        """Unique identifier, e.g. 'resort', 'real_estate'."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Display name, e.g. 'Resort & Hospitality'."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """One-line description shown in pack gallery."""
        ...

    @property
    @abstractmethod
    def icon(self) -> str:
        """Emoji or icon name for the pack card."""
        ...

    @property
    @abstractmethod
    def features(self) -> list[str]:
        """Bullet-point feature list shown on pack card."""
        ...

    @property
    @abstractmethod
    def wizard_schema(self) -> list[dict]:
        """Multi-step wizard definition.

        Each step is a dict with:
          - title: str
          - fields: list[{name, label, type, options?, required?, placeholder?}]
        """
        ...

    @abstractmethod
    def system_prompt_template(self, config: dict) -> str:
        """Generate the WhatsApp AI system prompt from wizard config."""
        ...

    @abstractmethod
    async def install(
        self,
        org_id: int,
        config: dict,
        session: AsyncSession,
    ) -> dict:
        """Create all DB records for this pack.

        Returns a summary dict:
          {"automations_created": N, "pipeline_created": bool, "pipeline_id": int|None}
        """
        ...

    async def uninstall(self, org_id: int, session: AsyncSession) -> None:
        """Remove automations and pipelines created by this pack.

        Identifies pack-owned records via their names (name prefix convention).
        Default implementation does nothing; override in subclasses if needed.
        """
        pass

    def to_dict(self) -> dict:
        """Serialize pack metadata for the gallery API."""
        return {
            "pack_id": self.pack_id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "features": self.features,
            "wizard_schema": self.wizard_schema,
        }
