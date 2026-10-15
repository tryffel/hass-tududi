"""Tests for the coordinator, sensors, to-do list and calendar."""

from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.components.todo import DOMAIN as TODO_DOMAIN
from homeassistant.config_entries import SOURCE_REAUTH, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.tududi.api import TududiAuthError, TududiConnectionError, TududiError
from custom_components.tududi.models import TaskStatus

from .conftest import setup_entry

TODO = "todo.tududi_giorgio"
CALENDAR = "calendar.tududi_giorgio"
ELECTRICITY = "11hxs1zevxa8284"  # due 2026-10-14
WATER = "ex1a89dc127fsiz"  # due 2026-10-15
OLD_PAID = "845be5x4t1x858s"  # done


def advance(hass: HomeAssistant, freezer: FrozenDateTimeFactory, delta: timedelta) -> None:
    """Move the clock forward and fire timers that became due."""
    freezer.tick(delta)
    async_fire_time_changed(hass, dt_util.utcnow() + delta)


@pytest.fixture(autouse=True)
async def frozen_today(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    """Freeze 'today' to the date the fixtures were captured."""
    await hass.config.async_set_time_zone("Europe/Helsinki")
    freezer.move_to("2026-10-15T09:00:00+00:00")


async def test_sensors(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)

    overdue = hass.states.get("sensor.tududi_giorgio_overdue")
    assert overdue.state == "1"
    assert [t["name"] for t in overdue.attributes["tasks"]] == ["Electricity invoice"]
    assert "note" not in overdue.attributes["tasks"][0]

    assert hass.states.get("sensor.tududi_giorgio_due_today").state == "1"

    week = hass.states.get("sensor.tududi_giorgio_due_this_week")
    assert week.state == "3"
    assert [t["name"] for t in week.attributes["tasks"]] == [
        "Water invoice",
        "Fix bike tyre",
        "Internet invoice",
    ]


async def test_sensors_follow_the_date(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, config_entry)
    advance(hass, freezer, timedelta(days=1))
    await hass.async_block_till_done(wait_background_tasks=True)
    # 16th: electricity and water are now overdue.
    assert hass.states.get("sensor.tududi_giorgio_overdue").state == "2"
    assert hass.states.get("sensor.tududi_giorgio_due_today").state == "0"


async def test_task_list_not_recorded(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    platform = hass.data["entity_components"]["sensor"].get_entity("sensor.tududi_giorgio_overdue")
    assert "tasks" in platform._unrecorded_attributes
    calendar = hass.data["entity_components"]["calendar"].get_entity(CALENDAR)
    assert {"message", "description"} <= calendar._unrecorded_attributes


async def test_todo_items(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    assert hass.states.get(TODO).state == "7"

    result = await hass.services.async_call(
        TODO_DOMAIN,
        "get_items",
        {"status": "needs_action"},
        target={"entity_id": TODO},
        blocking=True,
        return_response=True,
    )
    items = result[TODO]["items"]
    assert items[0]["summary"] == "Electricity invoice"
    assert items[0]["due"] == "2026-10-14"
    assert "52.10" in items[0]["description"]
    assert items[-1]["summary"] == "Replace battery: Hallway motion sensor"

    done = await hass.services.async_call(
        TODO_DOMAIN,
        "get_items",
        {"status": "completed"},
        target={"entity_id": TODO},
        blocking=True,
        return_response=True,
    )
    assert [i["summary"] for i in done[TODO]["items"]] == ["Old paid invoice"]


async def test_todo_add_item(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.services.async_call(
        TODO_DOMAIN,
        "add_item",
        {"item": "New", "due_date": "2026-11-01", "description": "Ref 42"},
        target={"entity_id": TODO},
        blocking=True,
    )
    mock_client.create_task.assert_awaited_once_with(
        "New", due_date=date(2026, 11, 1), note="Ref 42"
    )
    assert hass.states.get(TODO).state == "8"


async def test_todo_complete_item(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.services.async_call(
        TODO_DOMAIN,
        "update_item",
        {"item": "Electricity invoice", "status": "completed"},
        target={"entity_id": TODO},
        blocking=True,
    )
    mock_client.update_task.assert_awaited_once_with(ELECTRICITY, status=TaskStatus.DONE)
    assert hass.states.get(TODO).state == "6"
    assert hass.states.get("sensor.tududi_giorgio_overdue").state == "0"


async def test_todo_reopen_item(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.services.async_call(
        TODO_DOMAIN,
        "update_item",
        {"item": OLD_PAID, "status": "needs_action"},
        target={"entity_id": TODO},
        blocking=True,
    )
    mock_client.update_task.assert_awaited_once_with(OLD_PAID, status=TaskStatus.NOT_STARTED)


async def test_todo_rename_and_change_due(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.services.async_call(
        TODO_DOMAIN,
        "update_item",
        {"item": WATER, "rename": "Water bill", "due_date": "2026-10-20"},
        target={"entity_id": TODO},
        blocking=True,
    )
    mock_client.update_task.assert_awaited_once_with(
        WATER, name="Water bill", due_date=date(2026, 10, 20)
    )
    assert hass.states.get("sensor.tududi_giorgio_due_today").state == "0"


async def test_todo_clear_due_date(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.services.async_call(
        TODO_DOMAIN,
        "update_item",
        {"item": WATER, "due_date": None},
        target={"entity_id": TODO},
        blocking=True,
    )
    mock_client.update_task.assert_awaited_once_with(WATER, due_date=None)


async def test_todo_delete_items(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.services.async_call(
        TODO_DOMAIN,
        "remove_item",
        {"item": [WATER, ELECTRICITY]},
        target={"entity_id": TODO},
        blocking=True,
    )
    assert mock_client.delete_task.await_count == 2
    assert hass.states.get(TODO).state == "5"


async def test_todo_write_error_is_raised(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.update_task.side_effect = TududiError("boom")
    with pytest.raises(HomeAssistantError, match="boom"):
        await hass.services.async_call(
            TODO_DOMAIN,
            "update_item",
            {"item": WATER, "status": "completed"},
            target={"entity_id": TODO},
            blocking=True,
        )
    assert hass.states.get(TODO).state == "7"


async def test_calendar(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    state = hass.states.get(CALENDAR)
    assert state.state == "on"  # Water invoice is an all-day event today
    assert state.attributes["message"] == "Water invoice"

    result = await hass.services.async_call(
        "calendar",
        "get_events",
        {"start_date_time": "2026-10-13T00:00:00", "end_date_time": "2026-10-19T00:00:00"},
        target={"entity_id": CALENDAR},
        blocking=True,
        return_response=True,
    )
    events = result[CALENDAR]["events"]
    assert [(e["summary"], e["start"]) for e in events] == [
        ("Electricity invoice", "2026-10-14"),
        ("Water invoice", "2026-10-15"),
        ("Fix bike tyre", "2026-10-17"),
        ("Internet invoice", "2026-10-18"),
    ]


async def test_update_failure_marks_unavailable(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.get_tasks.side_effect = TududiConnectionError("down")
    advance(hass, freezer, timedelta(seconds=61))
    await hass.async_block_till_done(wait_background_tasks=True)
    assert hass.states.get(TODO).state == "unavailable"

    mock_client.get_tasks.side_effect = None
    advance(hass, freezer, timedelta(seconds=61))
    await hass.async_block_till_done(wait_background_tasks=True)
    assert hass.states.get(TODO).state == "7"


async def test_update_auth_failure_starts_reauth(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.get_tasks.side_effect = TududiAuthError("revoked")
    advance(hass, freezer, timedelta(seconds=61))
    await hass.async_block_till_done(wait_background_tasks=True)
    assert config_entry.state is ConfigEntryState.LOADED
    flows = hass.config_entries.flow.async_progress()
    assert any(f["context"]["source"] == SOURCE_REAUTH for f in flows)
