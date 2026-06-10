"""Pack installer — installs, uninstalls, and queries installed industry packs.

Usage:
    from api.services.whatsapp.pack_installer import pack_installer

    # List available packs
    packs = pack_installer.list_packs()

    # Install
    result = await pack_installer.install(org_id, "resort", wizard_config)

    # Get installed pack
    installed = await pack_installer.get_installed(org_id)

    # Uninstall
    await pack_installer.uninstall(org_id)
"""
from __future__ import annotations

import json
from typing import Optional

from loguru import logger

from api.db.base_client import BaseDBClient
from api.db.organization_configuration_client import OrganizationConfigurationClient
from api.enums import OrganizationConfigurationKey
from api.services.whatsapp.packs.base import IndustryPack
from api.services.whatsapp.packs.resort import ResortPack

_db = BaseDBClient()
_config_client = OrganizationConfigurationClient()

# Registry of all available packs
_PACKS: dict[str, IndustryPack] = {
    "resort": ResortPack(),
}


class PackInstaller:
    """Installs and manages industry packs for organizations."""

    def list_packs(self) -> list[dict]:
        """Return metadata for all available packs."""
        return [pack.to_dict() for pack in _PACKS.values()]

    def get_pack(self, pack_id: str) -> Optional[IndustryPack]:
        return _PACKS.get(pack_id)

    async def install(self, org_id: int, pack_id: str, config: dict) -> dict:
        """Install a pack for an org. Idempotent: re-running replaces the previous install.

        Steps:
        1. Uninstall any existing pack for this org
        2. Run the pack's install() to create DB records
        3. Generate and save the system prompt
        4. Save INDUSTRY_TYPE + INDUSTRY_CONFIG + BUSINESS_HOURS + AFTER_HOURS_MESSAGE
        """
        pack = _PACKS.get(pack_id)
        if not pack:
            raise ValueError(f"Unknown pack: {pack_id}")

        # Uninstall any existing pack first
        await self.uninstall(org_id)

        async with _db.async_session() as session:
            result = await pack.install(org_id, config, session)

        # Save system prompt
        system_prompt = pack.system_prompt_template(config)
        await _config_client.upsert_configuration(
            org_id,
            OrganizationConfigurationKey.WHATSAPP_SYSTEM_PROMPT.value,
            system_prompt,
        )

        # Save pack metadata
        await _config_client.upsert_configuration(
            org_id,
            OrganizationConfigurationKey.INDUSTRY_TYPE.value,
            pack_id,
        )
        await _config_client.upsert_configuration(
            org_id,
            OrganizationConfigurationKey.INDUSTRY_CONFIG.value,
            config,
        )

        # Save business hours if provided
        if "timezone" in config:
            business_hours = {
                "timezone": config.get("timezone", "Asia/Kolkata"),
                "slots": config.get("business_hours_slots", [
                    {"day": "Mon", "start": "08:00", "end": "22:00"},
                    {"day": "Tue", "start": "08:00", "end": "22:00"},
                    {"day": "Wed", "start": "08:00", "end": "22:00"},
                    {"day": "Thu", "start": "08:00", "end": "22:00"},
                    {"day": "Fri", "start": "08:00", "end": "22:00"},
                    {"day": "Sat", "start": "08:00", "end": "22:00"},
                    {"day": "Sun", "start": "08:00", "end": "22:00"},
                ]),
            }
            await _config_client.upsert_configuration(
                org_id,
                OrganizationConfigurationKey.BUSINESS_HOURS.value,
                business_hours,
            )

        if config.get("after_hours_message"):
            await _config_client.upsert_configuration(
                org_id,
                OrganizationConfigurationKey.AFTER_HOURS_MESSAGE.value,
                config["after_hours_message"],
            )

        logger.info(
            f"[pack_installer] Installed pack={pack_id} for org={org_id}: "
            f"{result['automations_created']} automations, pipeline_id={result.get('pipeline_id')}"
        )
        return {
            "pack_id": pack_id,
            "pack_name": pack.name,
            **result,
        }

    async def uninstall(self, org_id: int) -> None:
        """Remove the currently installed pack for an org."""
        installed = await self.get_installed(org_id)
        if not installed:
            return

        pack_id = installed.get("pack_id")
        pack = _PACKS.get(pack_id) if pack_id else None
        if pack:
            async with _db.async_session() as session:
                await pack.uninstall(org_id, session)

        # Clear configuration keys
        for key in [
            OrganizationConfigurationKey.INDUSTRY_TYPE,
            OrganizationConfigurationKey.INDUSTRY_CONFIG,
        ]:
            await _config_client.upsert_configuration(org_id, key.value, None)

        logger.info(f"[pack_installer] Uninstalled pack={pack_id} for org={org_id}")

    async def get_installed(self, org_id: int) -> Optional[dict]:
        """Return the installed pack + config for an org, or None."""
        industry_type = await _config_client.get_configuration_value(
            org_id, OrganizationConfigurationKey.INDUSTRY_TYPE.value
        )
        if not industry_type:
            return None

        industry_config = await _config_client.get_configuration_value(
            org_id, OrganizationConfigurationKey.INDUSTRY_CONFIG.value
        ) or {}

        pack = _PACKS.get(industry_type)
        pack_meta = pack.to_dict() if pack else {"pack_id": industry_type}

        return {
            "pack_id": industry_type,
            "pack_name": pack_meta.get("name", industry_type),
            "config": industry_config,
            "installed": True,
        }

    async def reconfigure(self, org_id: int, new_config: dict) -> dict:
        """Update wizard config and regenerate system prompt without reinstalling automations."""
        installed = await self.get_installed(org_id)
        if not installed:
            raise ValueError("No pack installed for this org")

        pack_id = installed["pack_id"]
        pack = _PACKS.get(pack_id)
        if not pack:
            raise ValueError(f"Pack {pack_id} not found")

        merged = {**installed.get("config", {}), **new_config}

        system_prompt = pack.system_prompt_template(merged)
        await _config_client.upsert_configuration(
            org_id, OrganizationConfigurationKey.WHATSAPP_SYSTEM_PROMPT.value, system_prompt
        )
        await _config_client.upsert_configuration(
            org_id, OrganizationConfigurationKey.INDUSTRY_CONFIG.value, merged
        )

        if "after_hours_message" in new_config:
            await _config_client.upsert_configuration(
                org_id, OrganizationConfigurationKey.AFTER_HOURS_MESSAGE.value, new_config["after_hours_message"]
            )

        return {"updated": True, "pack_id": pack_id}


# Module-level singleton
pack_installer = PackInstaller()
