"""Tududi integration for Home Assistant."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_API_KEY, CONF_URL, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import TududiAuthError, TududiClient, TududiError
from .const import CONF_VERIFY_SSL, DOMAIN
from .coordinator import TududiCoordinator
from .invoices import INVOICE_LINKS, InvoiceLinks
from .models import Profile
from .panel import async_register_panel
from .reminders import REMINDERS, EntryReminders, ReminderManager
from .services import async_setup_services
from .websocket import async_setup_websocket

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.CALENDAR, Platform.SENSOR, Platform.TODO]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up integration-wide services and reminder state."""
    manager = ReminderManager(hass)
    await manager.async_load()
    hass.data[REMINDERS] = manager
    links = InvoiceLinks(hass)
    await links.async_load()
    hass.data[INVOICE_LINKS] = links
    async_setup_services(hass)
    async_setup_websocket(hass)
    await async_register_panel(hass)
    return True


@dataclass
class TududiRuntimeData:
    """Objects shared by the platforms of one config entry."""

    client: TududiClient
    profile: Profile
    coordinator: TududiCoordinator


type TududiConfigEntry = ConfigEntry[TududiRuntimeData]


def create_client(hass: HomeAssistant, url: str, api_key: str, verify_ssl: bool) -> TududiClient:
    """Create an API client using Home Assistant's shared HTTP session."""
    session = async_get_clientsession(hass, verify_ssl=verify_ssl)
    return TududiClient(session, url, api_key)


async def async_setup_entry(hass: HomeAssistant, entry: TududiConfigEntry) -> bool:
    """Set up Tududi from a config entry."""
    client = create_client(
        hass,
        entry.data[CONF_URL],
        entry.data[CONF_API_KEY],
        entry.data.get(CONF_VERIFY_SSL, True),
    )
    try:
        profile = await client.get_profile()
    except TududiAuthError as err:
        raise ConfigEntryAuthFailed(str(err)) from err
    except TududiError as err:
        raise ConfigEntryNotReady(str(err)) from err

    coordinator = TududiCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = TududiRuntimeData(client=client, profile=profile, coordinator=coordinator)
    _LOGGER.debug("Connected to tududi at %s as %s", client.base_url, profile.email)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(EntryReminders(hass, entry, hass.data[REMINDERS]).async_start())
    return True


async def async_unload_entry(hass: HomeAssistant, entry: TududiConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
