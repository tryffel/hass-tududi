"""Tests for Tududi services."""

from __future__ import annotations

from datetime import date
from typing import Any
from unittest.mock import MagicMock

import probatio as vol
import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.tududi.api import TududiError
from custom_components.tududi.const import DOMAIN
from custom_components.tududi.models import Priority, TaskStatus

from .conftest import setup_entry

BILLS = "jeqrjkh14aj9w8q"
DEVICES = "5wp50a8gu85pd1c"
GIULIA = "mg57u3pu2i40r15"
WATER = "ex1a89dc127fsiz"


async def call(
    hass: HomeAssistant, service: str, entry: MockConfigEntry, **data: Any
) -> dict[str, Any]:
    result = await hass.services.async_call(
        DOMAIN,
        service,
        {"config_entry_id": entry.entry_id, **data},
        blocking=True,
        return_response=True,
    )
    assert result is not None
    return result


async def test_create_task_resolves_names(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(
        hass,
        "create_task",
        config_entry,
        name="Phone invoice",
        due_date="2026-11-01",
        priority="high",
        project="household BILLS",
        tags=["invoice"],
        note="Amount 20 EUR",
        assigned_to="Giulia",
    )
    mock_client.create_task.assert_awaited_once_with(
        "Phone invoice",
        due_date=date(2026, 11, 1),
        priority=Priority.HIGH,
        project_uid=BILLS,
        tags=["invoice"],
        note="Amount 20 EUR",
        assigned_to=GIULIA,
    )
    assert result["task"]["uid"] == "new-task-uid"
    assert "new-task-uid" in config_entry.runtime_data.coordinator.data.tasks


async def test_create_task_unknown_project(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "create_task", config_entry, name="x", project="Nope")
    assert err.value.translation_key == "project_not_found"
    mock_client.create_task.assert_not_awaited()


async def test_create_task_unknown_person(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "create_task", config_entry, name="x", assigned_to="Mario")
    assert err.value.translation_key == "person_not_found"


async def test_update_task_and_clear_fields(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(
        hass,
        "update_task",
        config_entry,
        uid=WATER,
        name="Water bill",
        due_date=None,
        project=None,
        assigned_to=None,
        status="waiting",
    )
    mock_client.update_task.assert_awaited_once_with(
        WATER,
        name="Water bill",
        due_date=None,
        status=TaskStatus.WAITING,
        project_uid=None,
        assigned_to=None,
    )
    assert result["task"]["name"] == "Water bill"
    assert result["task"]["status"] == "waiting"


async def test_complete_task(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(hass, "complete_task", config_entry, uid=WATER)
    mock_client.complete_task.assert_awaited_once_with(WATER)
    assert result["task"]["done"] is True
    assert hass.states.get("todo.tududi_giorgio").state == "6"


async def test_find_tasks_by_tag(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(hass, "find_tasks", config_entry, tag="INVOICE")
    names = [t["name"] for t in result["tasks"]]
    assert names == [
        "Electricity invoice",
        "Water invoice",
        "Internet invoice",
        "Insurance invoice",
        "Daycare invoice",
    ]
    assert result["tasks"][0]["note"].startswith("Amount 52.10")


async def test_find_tasks_by_marker_text(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(
        hass, "find_tasks", config_entry, text="ha:battery:sensor.hallway_motion_battery"
    )
    assert [t["name"] for t in result["tasks"]] == ["Replace battery: Hallway motion sensor"]

    result = await call(hass, "find_tasks", config_entry, text="ha:battery:sensor.other")
    assert result["tasks"] == []


async def test_find_tasks_by_project_and_done(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, tasks
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(hass, "find_tasks", config_entry, project="Devices")
    assert len(result["tasks"]) == 1

    mock_client.get_tasks.reset_mock()
    mock_client.get_tasks.return_value = tasks
    result = await call(hass, "find_tasks", config_entry, tag="invoice", include_done=True)
    mock_client.get_tasks.assert_awaited_once_with(include_done=True)
    assert "Old paid invoice" in [t["name"] for t in result["tasks"]]


async def test_add_note(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(
        hass,
        "add_note",
        config_entry,
        title="Hallway motion sensor",
        content="2026-10-15 replaced",
        project="Devices",
        tags=["battery"],
    )
    mock_client.create_note.assert_awaited_once_with(
        "Hallway motion sensor",
        content="2026-10-15 replaced",
        project_uid=DEVICES,
        tags=["battery"],
    )
    assert result["note"]["uid"] == "new-note-uid"
    assert "new-note-uid" in config_entry.runtime_data.coordinator.data.notes


async def test_service_unknown_entry(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    with pytest.raises(ServiceValidationError) as err:
        await hass.services.async_call(
            DOMAIN,
            "complete_task",
            {"config_entry_id": "missing", "uid": WATER},
            blocking=True,
            return_response=True,
        )
    assert err.value.translation_key == "entry_not_found"


async def test_service_entry_not_loaded(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    await hass.config_entries.async_unload(config_entry.entry_id)
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "complete_task", config_entry, uid=WATER)
    assert err.value.translation_key == "entry_not_loaded"


async def test_service_api_error(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.complete_task.side_effect = TududiError("boom")
    with pytest.raises(HomeAssistantError, match="boom"):
        await call(hass, "complete_task", config_entry, uid=WATER)


async def test_invalid_priority_rejected(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    with pytest.raises(vol.Invalid, match="priority"):
        await call(hass, "create_task", config_entry, name="x", priority="urgent")
