"""Tududi integration for Home Assistant."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_API_KEY, CONF_URL, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import TududiAuthError, TududiClient, TududiError
from .const import CONF_VERIFY_SSL
from .coordinator import TududiCoordinator
from .models import Profile

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.CALENDAR, Platform.SENSOR, Platform.TODO]


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
    return True


async def async_unload_entry(hass: HomeAssistant, entry: TududiConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
