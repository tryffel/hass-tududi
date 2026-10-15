"""Tests for the panel websocket API and panel registration."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockUser
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.tududi.api import TududiError
from custom_components.tududi.const import CONF_HA_USER, DOMAIN
from custom_components.tududi.models import TaskStatus

from .conftest import setup_entry

WATER = "ex1a89dc127fsiz"
DEVICES = "5wp50a8gu85pd1c"


class WsHelper:
    """Lazily connected websocket client (connect after the integration is set up)."""

    def __init__(self, hass: HomeAssistant, factory: WebSocketGenerator) -> None:
        self.hass = hass
        self.factory = factory
        self.client: Any = None
        self.counter = iter(range(1, 10_000))

    async def connect(self) -> Any:
        if self.client is None:
            self.client = await self.factory(self.hass)
        return self.client

    def next_id(self) -> int:
        return next(self.counter)

    async def __call__(self, type_: str, **data: Any) -> dict[str, Any]:
        client = await self.connect()
        await client.send_json({"id": self.next_id(), "type": type_, **data})
        return await client.receive_json()


@pytest.fixture
def ws(hass: HomeAssistant, hass_ws_client: WebSocketGenerator) -> WsHelper:
    """Websocket helper for the admin user."""
    return WsHelper(hass, hass_ws_client)


async def test_panel_registered(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    panels = hass.data[frontend.DATA_PANELS]
    assert "tududi" in panels
    assert panels["tududi"].sidebar_title == "Tududi"
    assert panels["tududi"].config["_panel_custom"]["name"] == "tududi-panel"


async def test_entries_visibility(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    ws,
    hass_admin_user: MockUser,
) -> None:
    await setup_entry(hass, config_entry)
    # Unlinked entries are visible to admins.
    result = await ws("tududi/entries")
    assert result["result"] == [
        {"entry_id": config_entry.entry_id, "title": "Giorgio", "linked": False}
    ]

    hass.config_entries.async_update_entry(
        config_entry, options={**config_entry.options, CONF_HA_USER: "someone-else"}
    )
    await hass.async_block_till_done()
    assert (await ws("tududi/entries"))["result"] == []

    hass.config_entries.async_update_entry(
        config_entry, options={**config_entry.options, CONF_HA_USER: hass_admin_user.id}
    )
    await hass.async_block_till_done()
    assert (await ws("tududi/entries"))["result"][0]["linked"] is True


async def test_other_users_account_is_forbidden(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    ws,
) -> None:
    await setup_entry(hass, config_entry)
    hass.config_entries.async_update_entry(
        config_entry, options={**config_entry.options, CONF_HA_USER: "someone-else"}
    )
    await hass.async_block_till_done()
    result = await ws("tududi/task/update", entry_id=config_entry.entry_id, uid=WATER, name="x")
    assert result["success"] is False
    assert result["error"]["code"] == "not_found"
    mock_client.update_task.assert_not_awaited()


async def test_non_admin_cannot_see_unlinked(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    await setup_entry(hass, config_entry)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json({"id": 1, "type": "tududi/entries"})
    assert (await client.receive_json())["result"] == []


async def test_subscribe_sends_snapshots(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    result = await ws("tududi/subscribe", entry_id=config_entry.entry_id)
    assert result["success"] is True

    event = await ws.client.receive_json()
    snap = event["event"]
    assert snap["entry_id"] == config_entry.entry_id
    assert snap["reminder_tag"] == "invoice"
    assert snap["self_person"] == "p3abp4qfi3gegzu"
    names = {t["name"] for t in snap["tasks"]}
    assert {"Water invoice", "Old paid invoice"} <= names
    water = next(t for t in snap["tasks"] if t["uid"] == WATER)
    assert water["note"] == "Amount 31.00 EUR"
    assert water["tags"] == ["invoice"]
    assert [p["name"] for p in snap["projects"]] == ["Devices", "Household bills"]
    assert "today" not in snap["tags"]  # system tags are hidden

    # A write pushes a new snapshot before the command result.
    await ws.client.send_json(
        {
            "id": ws.next_id(),
            "type": "tududi/task/update",
            "entry_id": config_entry.entry_id,
            "uid": WATER,
            "status": TaskStatus.DONE,
        }
    )
    pushed = await ws.client.receive_json()
    assert pushed["type"] == "event"
    water = next(t for t in pushed["event"]["tasks"] if t["uid"] == WATER)
    assert water["done"] is True
    result = await ws.client.receive_json()
    assert result["success"] is True


async def test_task_commands(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    entry_id = config_entry.entry_id

    result = await ws(
        "tududi/task/create",
        entry_id=entry_id,
        name="New",
        due_date="2026-11-01",
        tags=["invoice"],
        project_uid=DEVICES,
    )
    assert result["success"] is True
    assert result["result"]["uid"] == "new-task-uid"
    create_kwargs = mock_client.create_task.await_args
    assert create_kwargs.args == ("New",)
    assert create_kwargs.kwargs["project_uid"] == DEVICES
    assert str(create_kwargs.kwargs["due_date"]) == "2026-11-01"

    result = await ws(
        "tududi/task/update", entry_id=entry_id, uid=WATER, due_date=None, note=None, priority=2
    )
    assert result["success"] is True
    mock_client.update_task.assert_awaited_with(WATER, due_date=None, note=None, priority=2)

    result = await ws("tududi/task/delete", entry_id=entry_id, uid=WATER)
    assert result["success"] is True
    mock_client.delete_task.assert_awaited_with(WATER)


async def test_invalid_fields_rejected(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    result = await ws("tududi/task/update", entry_id=config_entry.entry_id, uid=WATER, priority=7)
    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_api_error_is_reported(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.update_task.side_effect = TududiError("boom")
    result = await ws("tududi/task/update", entry_id=config_entry.entry_id, uid=WATER, name="x")
    assert result["success"] is False
    assert result["error"]["code"] == "tududi_error"
    assert "boom" in result["error"]["message"]


async def test_note_commands(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    entry_id = config_entry.entry_id
    result = await ws(
        "tududi/note/create",
        entry_id=entry_id,
        title="Battery log",
        content="replaced",
        project_uid=DEVICES,
    )
    assert result["result"]["uid"] == "new-note-uid"
    assert "new-note-uid" in config_entry.runtime_data.coordinator.data.notes

    mock_client.update_note.return_value = mock_client.create_note.side_effect(
        "Battery log", content="replaced twice"
    )
    result = await ws(
        "tududi/note/update", entry_id=entry_id, uid="new-note-uid", content="replaced twice"
    )
    assert result["result"]["content"] == "replaced twice"

    result = await ws("tududi/note/delete", entry_id=entry_id, uid="new-note-uid")
    assert result["success"] is True
    assert "new-note-uid" not in config_entry.runtime_data.coordinator.data.notes


async def test_refresh(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    calls = mock_client.get_tasks.await_count
    result = await ws("tududi/refresh", entry_id=config_entry.entry_id)
    assert result["success"] is True
    assert mock_client.get_tasks.await_count == calls + 1


async def test_unknown_entry(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, ws
) -> None:
    await setup_entry(hass, config_entry)
    result = await ws("tududi/subscribe", entry_id="missing")
    assert result["error"]["code"] == "not_found"
    assert DOMAIN == "tududi"
