"""Base entity for Tududi."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import TududiCoordinator


class TududiEntity(CoordinatorEntity[TududiCoordinator]):
    """An entity belonging to one tududi account (one device per account)."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: TududiCoordinator, key: str) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        entry = coordinator.config_entry
        self._attr_unique_id = f"{entry.unique_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, str(entry.unique_id))},
            name=f"Tududi {entry.title}",
            manufacturer="tududi",
            entry_type=DeviceEntryType.SERVICE,
            configuration_url=coordinator.client.base_url,
        )
