"""Tests for the config and options flows."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.config_entries import SOURCE_USER
from homeassistant.const import CONF_API_KEY, CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.tududi.api import TududiAuthError, TududiConnectionError
from custom_components.tududi.const import (
    CONF_DEFAULT_NOTIFY,
    CONF_HA_USER,
    CONF_PERSON_NOTIFY,
    CONF_REMINDER_DAYS_BEFORE,
    CONF_REMINDER_INCLUDE_OVERDUE,
    CONF_REMINDER_TAG,
    CONF_REMINDER_TIME,
    CONF_REMINDERS_ENABLED,
    CONF_UPDATE_INTERVAL,
    CONF_VERIFY_SSL,
    DEFAULT_OPTIONS,
    DOMAIN,
)
from custom_components.tududi.models import Person, Profile

from .conftest import API_KEY, BASE_URL

PROFILE = Profile(uid="user-uid-1", email="giorgio@example.com", name="Giorgio")
USER_INPUT = {CONF_URL: f"{BASE_URL}/api/v1/", CONF_API_KEY: API_KEY, CONF_VERIFY_SSL: True}

GET_PROFILE = "custom_components.tududi.api.TududiClient.get_profile"


@pytest.fixture
def mock_profile():
    with patch(GET_PROFILE, AsyncMock(return_value=PROFILE)) as mock:
        yield mock


async def test_user_flow_creates_entry(hass: HomeAssistant, mock_profile) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Giorgio"
    assert result["data"] == {CONF_URL: BASE_URL, CONF_API_KEY: API_KEY, CONF_VERIFY_SSL: True}
    assert result["options"] == DEFAULT_OPTIONS
    assert result["result"].unique_id == PROFILE.uid


@pytest.mark.parametrize(
    ("exc", "error"),
    [
        (TududiAuthError("bad"), "invalid_auth"),
        (TududiConnectionError("down"), "cannot_connect"),
        (RuntimeError("boom"), "unknown"),
    ],
)
async def test_user_flow_errors_then_recovers(
    hass: HomeAssistant, exc: Exception, error: str
) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    with patch(GET_PROFILE, AsyncMock(side_effect=exc)):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": error}

    with patch(GET_PROFILE, AsyncMock(return_value=PROFILE)):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_user_flow_duplicate_aborts(hass: HomeAssistant, mock_profile) -> None:
    MockConfigEntry(domain=DOMAIN, unique_id=PROFILE.uid, data=USER_INPUT).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_reauth_updates_key(hass: HomeAssistant, mock_profile) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=PROFILE.uid,
        data={CONF_URL: BASE_URL, CONF_API_KEY: "old", CONF_VERIFY_SSL: True},
    )
    entry.add_to_hass(hass)
    result = await entry.start_reauth_flow(hass)
    assert result["step_id"] == "reauth_confirm"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_API_KEY: "new"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert entry.data[CONF_API_KEY] == "new"


async def test_reauth_wrong_account(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="someone-else",
        data={CONF_URL: BASE_URL, CONF_API_KEY: "old", CONF_VERIFY_SSL: True},
    )
    entry.add_to_hass(hass)
    result = await entry.start_reauth_flow(hass)
    with patch(GET_PROFILE, AsyncMock(return_value=PROFILE)):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_API_KEY: "new"}
        )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "wrong_account"
    assert entry.data[CONF_API_KEY] == "old"


async def test_reconfigure(hass: HomeAssistant, mock_profile) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=PROFILE.uid,
        data={CONF_URL: BASE_URL, CONF_API_KEY: API_KEY, CONF_VERIFY_SSL: True},
    )
    entry.add_to_hass(hass)
    result = await entry.start_reconfigure_flow(hass)
    assert result["step_id"] == "reconfigure"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_URL: "https://new.example.com/", CONF_API_KEY: "k2", CONF_VERIFY_SSL: False},
    )
    assert result["reason"] == "reconfigure_successful"
    assert entry.data == {
        CONF_URL: "https://new.example.com",
        CONF_API_KEY: "k2",
        CONF_VERIFY_SSL: False,
    }


async def test_options_flow_with_people(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    hass.services.async_register("notify", "mobile_app_giorgio", lambda call: None)
    user = await hass.auth.async_create_user("Giorgio")

    people = [
        Person(uid="p1", name="Giorgio", is_self=True),
        Person(uid="p2", name="Giulia"),
    ]
    result = await hass.config_entries.options.async_init(config_entry.entry_id)
    assert result["step_id"] == "init"

    mock_client.get_people.return_value = people
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            CONF_HA_USER: user.id,
            CONF_UPDATE_INTERVAL: 30,
            CONF_DEFAULT_NOTIFY: "notify.mobile_app_giorgio",
            CONF_REMINDERS_ENABLED: True,
            CONF_REMINDER_TAG: "bill",
            CONF_REMINDER_DAYS_BEFORE: 5,
            CONF_REMINDER_TIME: "08:30:00",
            CONF_REMINDER_INCLUDE_OVERDUE: False,
        },
    )
    assert result["step_id"] == "notify"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"Giulia": "notify.mobile_app_giulia"}
    )
    await hass.async_block_till_done()
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert config_entry.options == {
        CONF_HA_USER: user.id,
        CONF_UPDATE_INTERVAL: 30,
        CONF_DEFAULT_NOTIFY: "notify.mobile_app_giorgio",
        CONF_PERSON_NOTIFY: {"p2": "notify.mobile_app_giulia"},
        CONF_REMINDERS_ENABLED: True,
        CONF_REMINDER_TAG: "bill",
        CONF_REMINDER_DAYS_BEFORE: 5,
        CONF_REMINDER_TIME: "08:30:00",
        CONF_REMINDER_INCLUDE_OVERDUE: False,
    }


async def test_options_flow_without_people_skips_notify_step(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(config_entry.entry_id)
    mock_client.get_people.side_effect = TududiConnectionError("down")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            CONF_UPDATE_INTERVAL: 60,
            CONF_REMINDERS_ENABLED: False,
            CONF_REMINDER_TAG: "invoice",
            CONF_REMINDER_DAYS_BEFORE: 7,
            CONF_REMINDER_TIME: "09:00:00",
            CONF_REMINDER_INCLUDE_OVERDUE: True,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert config_entry.options[CONF_HA_USER] is None
    assert config_entry.options[CONF_REMINDERS_ENABLED] is False
