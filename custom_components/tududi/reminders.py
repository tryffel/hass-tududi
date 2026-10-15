"""Due date reminders for tagged tududi tasks (e.g. invoices)."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util.hass_dict import HassKey

from .const import (
    CONF_DEFAULT_NOTIFY,
    CONF_PERSON_NOTIFY,
    CONF_REMINDER_DAYS_BEFORE,
    CONF_REMINDER_INCLUDE_OVERDUE,
    CONF_REMINDER_TAG,
    CONF_REMINDER_TIME,
    CONF_REMINDERS_ENABLED,
    DEFAULT_OPTIONS,
    DOMAIN,
)
from .invoices import InvoiceData, format_amount
from .models import Task

if TYPE_CHECKING:
    from . import TududiConfigEntry
    from .coordinator import TududiCoordinator, TududiData

_LOGGER = logging.getLogger(__name__)

REMINDERS: HassKey[ReminderManager] = HassKey(f"{DOMAIN}_reminders")
STORAGE_KEY = f"{DOMAIN}.reminders"
STORAGE_VERSION = 1

EVENT_REMINDER = f"{DOMAIN}_reminder"
EVENT_MOBILE_APP_ACTION = "mobile_app_notification_action"

ACTION_PREFIX = "TUDUDI"
ACTION_PAID = "PAID"
ACTION_SNOOZE = "SNOOZE"
SNOOZE_DAYS = 1


def build_action(kind: str, entry_id: str, uid: str) -> str:
    """Build a notification action id: TUDUDI|PAID|<entry_id>|<task uid>."""
    return f"{ACTION_PREFIX}|{kind}|{entry_id}|{uid}"


def parse_action(action: str) -> tuple[str, str, str] | None:
    """Parse a notification action id built by build_action."""
    parts = action.split("|")
    if len(parts) != 4 or parts[0] != ACTION_PREFIX:
        return None
    return parts[1], parts[2], parts[3]


def due_text(days_left: int) -> str:
    """Human readable due description."""
    if days_left < -1:
        return f"Overdue by {-days_left} days"
    if days_left == -1:
        return "Overdue by 1 day"
    if days_left == 0:
        return "Due today"
    if days_left == 1:
        return "Due tomorrow"
    return f"Due in {days_left} days"


def parse_time(value: str | None) -> time:
    """Parse the HH:MM[:SS] reminder time option."""
    parsed = dt_util.parse_time(value or "") if value else None
    return parsed or time(9, 0)


@dataclass(slots=True)
class Reminder:
    """A reminder about to be sent."""

    task: Task
    days_left: int
    target: str | None
    invoice: InvoiceData | None = None


def select_reminders(data: TududiData, options: dict[str, Any], today: date) -> list[Reminder]:
    """Return reminders this account is responsible for today.

    Routing: an assigned task goes to the assignee (the account owner's default
    target if the assignee is the owner, otherwise the per-person mapping). Tasks
    that are unassigned, or assigned to someone without a mapping, are handled by
    the account that owns the task. Tasks this account is not responsible for are
    skipped; the responsible account (if configured) sends them.
    """
    opts = {**DEFAULT_OPTIONS, **options}
    tag = str(opts[CONF_REMINDER_TAG]).casefold()
    days_before = int(opts[CONF_REMINDER_DAYS_BEFORE])
    include_overdue = bool(opts[CONF_REMINDER_INCLUDE_OVERDUE])
    default_target: str | None = opts[CONF_DEFAULT_NOTIFY]
    person_targets: dict[str, str] = opts[CONF_PERSON_NOTIFY] or {}
    self_person = data.self_person
    self_user_id = data.self_user_id

    reminders = []
    for task in data.open_tasks:
        if not task.due_date or tag not in {t.casefold() for t in task.tags}:
            continue
        days_left = (task.due_date - today).days
        if days_left > days_before or (days_left < 0 and not include_overdue):
            continue

        owned = self_user_id is not None and task.owner_id == self_user_id
        if task.assigned_to and self_person and task.assigned_to == self_person.uid:
            target = default_target
        elif task.assigned_to and task.assigned_to in person_targets:
            target = person_targets[task.assigned_to]
        elif owned:
            target = default_target
        else:
            continue
        reminders.append(Reminder(task, days_left, target, data.invoices.get(task.uid)))

    reminders.sort(key=lambda r: (r.days_left, r.task.name.casefold()))
    return reminders


class ReminderManager:
    """Shared reminder state (sent log, snoozes) and per-entry schedules."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the manager."""
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.sent: dict[str, str] = {}
        self.snoozed: dict[str, str] = {}
        self._unsub_action: CALLBACK_TYPE | None = None
        self.today: Callable[[], date] = lambda: dt_util.now().date()

    async def async_load(self) -> None:
        """Load stored state and listen for notification actions."""
        stored = await self._store.async_load() or {}
        self.sent = dict(stored.get("sent", {}))
        self.snoozed = dict(stored.get("snoozed", {}))
        self._prune()
        self._unsub_action = self.hass.bus.async_listen(
            EVENT_MOBILE_APP_ACTION, self._handle_action
        )

    @callback
    def async_shutdown(self) -> None:
        """Stop listening for actions."""
        if self._unsub_action:
            self._unsub_action()
            self._unsub_action = None

    def _prune(self) -> None:
        today = self.today().isoformat()
        self.sent = {uid: day for uid, day in self.sent.items() if day >= today}
        self.snoozed = {uid: day for uid, day in self.snoozed.items() if day > today}

    @callback
    def _save(self) -> None:
        self._store.async_delay_save(
            lambda: {"sent": self.sent, "snoozed": self.snoozed},
            1,
        )

    def is_snoozed(self, uid: str) -> bool:
        """Return True if reminders for the task are snoozed today."""
        until = self.snoozed.get(uid)
        return until is not None and until > self.today().isoformat()

    @callback
    def snooze(self, uid: str, days: int = SNOOZE_DAYS) -> date:
        """Skip reminders for the next `days` days; they resume the day after."""
        until = self.today() + timedelta(days=days + 1)
        self.snoozed[uid] = until.isoformat()
        self._save()
        return until

    async def async_run(self, entry: TududiConfigEntry, *, force: bool = False) -> dict[str, Any]:
        """Send today's reminders for one account. Returns a summary."""
        coordinator: TududiCoordinator = entry.runtime_data.coordinator
        today = self.today()
        self._prune()
        summary: dict[str, list[dict[str, Any]]] = {"sent": [], "skipped": [], "failed": []}

        if not entry.options.get(CONF_REMINDERS_ENABLED, True) and not force:
            return summary

        for reminder in select_reminders(coordinator.data, dict(entry.options), today):
            uid = reminder.task.uid
            info = {
                "uid": uid,
                "name": reminder.task.name,
                "days_left": reminder.days_left,
                "target": reminder.target,
            }
            if self.is_snoozed(uid):
                summary["skipped"].append({**info, "reason": "snoozed"})
                continue
            if self.sent.get(uid) == today.isoformat() and not force:
                summary["skipped"].append({**info, "reason": "already_sent"})
                continue

            self.hass.bus.async_fire(
                EVENT_REMINDER,
                {
                    "config_entry_id": entry.entry_id,
                    "uid": uid,
                    "name": reminder.task.name,
                    "due_date": reminder.task.due_date.isoformat()
                    if reminder.task.due_date
                    else None,
                    "days_left": reminder.days_left,
                    "target": reminder.target,
                },
            )
            if reminder.target is None:
                summary["skipped"].append({**info, "reason": "no_target"})
                continue
            try:
                await self._notify(entry.entry_id, reminder)
            except HomeAssistantError as err:
                _LOGGER.warning(
                    "Sending reminder for task %s to %s failed: %s", uid, reminder.target, err
                )
                summary["failed"].append({**info, "error": str(err)})
                continue
            self.sent[uid] = today.isoformat()
            summary["sent"].append(info)

        self._save()
        _LOGGER.debug(
            "Reminders for %s: %d sent, %d skipped, %d failed",
            entry.title,
            len(summary["sent"]),
            len(summary["skipped"]),
            len(summary["failed"]),
        )
        return summary

    async def _notify(self, entry_id: str, reminder: Reminder) -> None:
        assert reminder.target
        domain, _, service = reminder.target.partition(".")
        if domain != "notify" or not self.hass.services.has_service(domain, service):
            raise HomeAssistantError(f"Notify service {reminder.target} does not exist")
        task = reminder.task
        message = f"{due_text(reminder.days_left)} ({task.due_date})"
        invoice = reminder.invoice
        if invoice and invoice.amount is not None:
            message += f" · {format_amount(invoice.amount)} {invoice.currency or ''}".rstrip()
        if invoice and invoice.reference:
            message += f"\nReference: {invoice.reference}"
        if task.note:
            message += f"\n{task.note.strip().splitlines()[0]}"
        await self.hass.services.async_call(
            domain,
            service,
            {
                "title": task.name,
                "message": message,
                "data": {
                    "tag": f"tududi-{task.uid}",
                    "group": "tududi",
                    "actions": [
                        {
                            "action": build_action(ACTION_PAID, entry_id, task.uid),
                            "title": "Mark paid",
                        },
                        {
                            "action": build_action(ACTION_SNOOZE, entry_id, task.uid),
                            "title": "Snooze 1 day",
                        },
                    ],
                },
            },
            blocking=True,
        )

    async def _handle_action(self, event: Event) -> None:
        parsed = parse_action(str(event.data.get("action", "")))
        if parsed is None:
            return
        kind, entry_id, uid = parsed
        if kind == ACTION_SNOOZE:
            until = self.snooze(uid)
            _LOGGER.debug("Task %s snoozed, reminders resume %s", uid, until)
            return
        if kind == ACTION_PAID:
            entry = self.hass.config_entries.async_get_entry(entry_id)
            if (
                entry is None
                or entry.domain != DOMAIN
                or entry.state is not ConfigEntryState.LOADED
            ):
                _LOGGER.warning("Cannot mark task %s paid: account %s not loaded", uid, entry_id)
                return
            try:
                await entry.runtime_data.coordinator.async_complete_task(uid)
            except HomeAssistantError as err:
                _LOGGER.warning("Marking task %s paid failed: %s", uid, err)
                return
            _LOGGER.debug("Task %s marked paid from notification", uid)


class EntryReminders:
    """Daily reminder schedule of one config entry."""

    def __init__(
        self, hass: HomeAssistant, entry: TududiConfigEntry, manager: ReminderManager
    ) -> None:
        """Initialize the schedule."""
        self.hass = hass
        self.entry = entry
        self.manager = manager
        self.at = parse_time(entry.options.get(CONF_REMINDER_TIME))

    @callback
    def async_start(self) -> CALLBACK_TYPE:
        """Schedule the daily run; run now if today's reminder time has passed.

        Catching up is safe: tasks already reminded today are skipped.
        """
        unsub = async_track_time_change(
            self.hass, self._run, hour=self.at.hour, minute=self.at.minute, second=self.at.second
        )
        if dt_util.now().time() >= self.at:
            self.entry.async_create_background_task(
                self.hass, self.manager.async_run(self.entry), "tududi reminder catch-up"
            )
        return unsub

    async def _run(self, _now: Any) -> None:
        await self.manager.async_run(self.entry)
