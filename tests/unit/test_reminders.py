"""Tests for due date reminders."""

from __future__ import annotations

from dataclasses import replace
from datetime import date, timedelta
from typing import Any
from unittest.mock import MagicMock

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.tududi.const import (
    CONF_DEFAULT_NOTIFY,
    CONF_PERSON_NOTIFY,
    CONF_REMINDER_INCLUDE_OVERDUE,
    CONF_REMINDERS_ENABLED,
    DEFAULT_OPTIONS,
    DOMAIN,
)
from custom_components.tududi.coordinator import TududiData
from custom_components.tududi.models import Person, Task
from custom_components.tududi.reminders import (
    ACTION_PAID,
    ACTION_SNOOZE,
    EVENT_REMINDER,
    build_action,
    due_text,
    parse_action,
    select_reminders,
)

from .conftest import load_fixture, setup_entry

TODAY = date(2026, 10, 15)
GIORGIO = "p3abp4qfi3gegzu"
GIULIA = "mg57u3pu2i40r15"
INTERNET = "53s7kgtqa3h0m6f"  # due +3, assigned to Giulia
WATER = "ex1a89dc127fsiz"  # due today

OPTIONS = {
    **DEFAULT_OPTIONS,
    CONF_DEFAULT_NOTIFY: "notify.giorgio_phone",
    CONF_PERSON_NOTIFY: {GIULIA: "notify.giulia_phone"},
}


def _data(tasks: list[Task], self_uid: str = GIORGIO) -> TududiData:
    people = [Person.from_api(p) for p in load_fixture("people")["people"]]
    people = [replace(p, is_self=p.uid == self_uid) for p in people]
    return TududiData(tasks={t.uid: t for t in tasks}, people={p.uid: p for p in people})


def _routes(reminders) -> list[tuple[str, int, str | None]]:
    return [(r.task.name, r.days_left, r.target) for r in reminders]


# --------------------------------------------------------------------------- selection


def test_select_from_owner_account(tasks: list[Task]) -> None:
    assert _routes(select_reminders(_data(tasks), OPTIONS, TODAY)) == [
        ("Electricity invoice", -1, "notify.giorgio_phone"),
        ("Water invoice", 0, "notify.giorgio_phone"),
        ("Internet invoice", 3, "notify.giulia_phone"),
        ("Insurance invoice", 7, "notify.giorgio_phone"),
    ]


def test_select_without_overdue(tasks: list[Task]) -> None:
    options = {**OPTIONS, CONF_REMINDER_INCLUDE_OVERDUE: False}
    names = [r.task.name for r in select_reminders(_data(tasks), options, TODAY)]
    assert "Electricity invoice" not in names


def test_select_from_assignee_account(tasks: list[Task]) -> None:
    """Giulia's account only handles tasks assigned to her; owner's account the rest."""
    options = {**DEFAULT_OPTIONS, CONF_DEFAULT_NOTIFY: "notify.giulia_phone"}
    assert _routes(select_reminders(_data(tasks, self_uid=GIULIA), options, TODAY)) == [
        ("Internet invoice", 3, "notify.giulia_phone"),
    ]


def test_assignee_without_mapping_falls_back_to_owner(tasks: list[Task]) -> None:
    options = {**OPTIONS, CONF_PERSON_NOTIFY: {}}
    routes = dict((n, t) for n, _, t in _routes(select_reminders(_data(tasks), options, TODAY)))
    assert routes["Internet invoice"] == "notify.giorgio_phone"


def test_due_text() -> None:
    assert [due_text(d) for d in (-3, -1, 0, 1, 5)] == [
        "Overdue by 3 days",
        "Overdue by 1 day",
        "Due today",
        "Due tomorrow",
        "Due in 5 days",
    ]


def test_action_roundtrip() -> None:
    action = build_action(ACTION_PAID, "entry1", "uid1")
    assert parse_action(action) == (ACTION_PAID, "entry1", "uid1")
    assert parse_action("SOMETHING_ELSE") is None


# --------------------------------------------------------------------------- with hass


@pytest.fixture
def notify_calls(hass: HomeAssistant) -> dict[str, list[ServiceCall]]:
    return {
        "giorgio": async_mock_service(hass, "notify", "giorgio_phone"),
        "giulia": async_mock_service(hass, "notify", "giulia_phone"),
    }


def _entry(base: MockConfigEntry, **options: Any) -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title=base.title,
        unique_id=base.unique_id,
        data=dict(base.data),
        options={**OPTIONS, **options},
    )


@pytest.fixture
def entry(config_entry: MockConfigEntry) -> MockConfigEntry:
    return _entry(config_entry)


@pytest.fixture(autouse=True)
async def morning(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    """08:00 local time on the fixture date, before the 09:00 reminder time."""
    await hass.config.async_set_time_zone("Europe/Helsinki")
    freezer.move_to("2026-10-15T05:00:00+00:00")


async def run(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    result = await hass.services.async_call(
        DOMAIN, "run_reminders", data, blocking=True, return_response=True
    )
    assert result is not None
    return result["accounts"]


async def advance(hass: HomeAssistant, freezer: FrozenDateTimeFactory, delta: timedelta) -> None:
    freezer.tick(delta)
    async_fire_time_changed(hass, dt_util.utcnow() + delta)
    await hass.async_block_till_done(wait_background_tasks=True)


async def test_run_sends_notifications(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
) -> None:
    await setup_entry(hass, entry)
    events = async_capture_events(hass, EVENT_REMINDER)

    result = (await run(hass))[entry.entry_id]
    assert len(result["sent"]) == 4
    assert [c.data["title"] for c in notify_calls["giorgio"]] == [
        "Electricity invoice",
        "Water invoice",
        "Insurance invoice",
    ]
    assert [c.data["title"] for c in notify_calls["giulia"]] == ["Internet invoice"]

    first = notify_calls["giorgio"][0].data
    assert first["message"] == "Overdue by 1 day (2026-10-14)\nAmount 52.10 EUR"
    actions = [a["action"] for a in first["data"]["actions"]]
    assert actions == [
        build_action(ACTION_PAID, entry.entry_id, "11hxs1zevxa8284"),
        build_action(ACTION_SNOOZE, entry.entry_id, "11hxs1zevxa8284"),
    ]
    assert len(events) == 4
    assert events[0].data["days_left"] == -1


async def test_run_once_per_day(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, entry)
    await run(hass)
    second = (await run(hass))[entry.entry_id]
    assert second["sent"] == []
    assert {s["reason"] for s in second["skipped"]} == {"already_sent"}

    forced = (await run(hass, force=True))[entry.entry_id]
    assert len(forced["sent"]) == 4

    freezer.tick(timedelta(days=1))  # next day, before the scheduled time
    next_day = (await run(hass))[entry.entry_id]
    assert len(next_day["sent"]) == 4


async def test_scheduled_run_and_catch_up(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, entry)
    assert notify_calls["giorgio"] == []  # 08:00, not yet

    await advance(hass, freezer, timedelta(hours=1))  # 09:00
    assert len(notify_calls["giorgio"]) == 3

    # Restart after reminder time: catch-up runs, but nothing is sent twice.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    assert len(notify_calls["giorgio"]) == 3


async def test_catch_up_after_missed_time(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-10-15T08:00:00+00:00")  # 11:00 local, HA was down at 09:00
    await setup_entry(hass, entry)
    await hass.async_block_till_done(wait_background_tasks=True)
    assert len(notify_calls["giorgio"]) == 3


async def test_first_install_then_configure_targets(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
    freezer: FrozenDateTimeFactory,
) -> None:
    """Added after reminder time without targets; configuring targets sends today."""
    freezer.move_to("2026-10-15T08:00:00+00:00")
    entry = _entry(config_entry, **{CONF_DEFAULT_NOTIFY: None, CONF_PERSON_NOTIFY: {}})
    await setup_entry(hass, entry)
    await hass.async_block_till_done(wait_background_tasks=True)
    assert notify_calls["giorgio"] == []

    hass.config_entries.async_update_entry(entry, options=OPTIONS)
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    assert len(notify_calls["giorgio"]) == 3
    assert len(notify_calls["giulia"]) == 1


async def test_disabled(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
) -> None:
    entry = _entry(config_entry, **{CONF_REMINDERS_ENABLED: False})
    await setup_entry(hass, entry)
    assert (await run(hass))[entry.entry_id]["sent"] == []


async def test_missing_notify_service_fails_and_retries(
    hass: HomeAssistant, entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, entry)
    result = (await run(hass))[entry.entry_id]
    assert len(result["failed"]) == 4
    assert "does not exist" in result["failed"][0]["error"]
    # Not marked as sent, so the next run tries again.
    assert len((await run(hass))[entry.entry_id]["failed"]) == 4


async def test_snooze_action(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, entry)
    hass.bus.async_fire(
        "mobile_app_notification_action",
        {"action": build_action(ACTION_SNOOZE, entry.entry_id, WATER)},
    )
    await hass.async_block_till_done()

    def water_reason(result: dict[str, Any]) -> str | None:
        skipped = {s["uid"]: s["reason"] for s in result[entry.entry_id]["skipped"]}
        return skipped.get(WATER)

    assert water_reason(await run(hass)) == "snoozed"
    freezer.tick(timedelta(days=1))
    assert water_reason(await run(hass)) == "snoozed"
    freezer.tick(timedelta(days=1))
    result = await run(hass)
    assert WATER in {s["uid"] for s in result[entry.entry_id]["sent"]}


async def test_paid_action_completes_task(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
) -> None:
    await setup_entry(hass, entry)
    hass.bus.async_fire(
        "mobile_app_notification_action",
        {"action": build_action(ACTION_PAID, entry.entry_id, WATER)},
    )
    await hass.async_block_till_done()
    mock_client.complete_task.assert_awaited_once_with(WATER)
    assert hass.states.get("sensor.tududi_giorgio_due_today").state == "0"


async def test_paid_action_unknown_entry_is_ignored(
    hass: HomeAssistant, entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, entry)
    hass.bus.async_fire(
        "mobile_app_notification_action",
        {"action": build_action(ACTION_PAID, "missing", WATER)},
    )
    await hass.async_block_till_done()
    mock_client.complete_task.assert_not_awaited()


async def test_state_survives_restart(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    mock_client: MagicMock,
    notify_calls: dict[str, list[ServiceCall]],
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, entry)
    await run(hass)
    hass.bus.async_fire(
        "mobile_app_notification_action",
        {"action": build_action(ACTION_SNOOZE, entry.entry_id, WATER)},
    )
    await hass.async_block_till_done()
    await advance(hass, freezer, timedelta(seconds=2))  # delayed save
    stored = hass_storage["tududi.reminders"]["data"]
    assert stored["snoozed"][WATER] == "2026-10-17"
    assert stored["sent"][INTERNET] == "2026-10-15"
    # Only uids and dates are stored, never task contents.
    assert "invoice" not in str(stored).lower()
