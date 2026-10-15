"""Data update coordinator for one tududi account."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable
from dataclasses import dataclass, field, replace
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, HomeAssistantError
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .api import TududiAuthError, TududiClient, TududiError, TududiNotFoundError
from .const import CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL, DOMAIN
from .models import Note, Person, Project, Tag, Task

if TYPE_CHECKING:
    from . import TududiConfigEntry

_LOGGER = logging.getLogger(__name__)

RECENTLY_DONE_LIMIT = 20
DUE_SOON_DAYS = 7


@dataclass(slots=True)
class TududiData:
    """Cached snapshot of one tududi account. Held in memory only."""

    tasks: dict[str, Task] = field(default_factory=dict)
    projects: dict[str, Project] = field(default_factory=dict)
    tags: list[Tag] = field(default_factory=list)
    notes: dict[str, Note] = field(default_factory=dict)
    people: dict[str, Person] = field(default_factory=dict)

    @property
    def open_tasks(self) -> list[Task]:
        """Return tasks that still need action."""
        return [t for t in self.tasks.values() if t.is_open]

    @property
    def self_person(self) -> Person | None:
        """Return the person record of the account owner."""
        return next((p for p in self.people.values() if p.is_self), None)

    @property
    def self_user_id(self) -> int | None:
        """Return the tududi user id of the account owner."""
        person = self.self_person
        return person.linked_user_id if person else None

    def overdue(self, today: date) -> list[Task]:
        """Open tasks with a due date before today."""
        return _by_due([t for t in self.open_tasks if t.due_date and t.due_date < today])

    def due_today(self, today: date) -> list[Task]:
        """Open tasks due today."""
        return _by_due([t for t in self.open_tasks if t.due_date == today])

    def due_this_week(self, today: date) -> list[Task]:
        """Open tasks due today or within the next six days."""
        end = today + timedelta(days=DUE_SOON_DAYS - 1)
        return _by_due([t for t in self.open_tasks if t.due_date and today <= t.due_date <= end])


def _by_due(tasks: list[Task]) -> list[Task]:
    return sorted(tasks, key=lambda t: (t.due_date or date.max, t.name.lower()))


class TududiCoordinator(DataUpdateCoordinator[TududiData]):
    """Fetch and cache tasks, projects, tags, notes and people for one account."""

    config_entry: TududiConfigEntry

    def __init__(self, hass: HomeAssistant, entry: TududiConfigEntry, client: TududiClient) -> None:
        """Initialize the coordinator."""
        interval = int(entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL))
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=f"{DOMAIN} {entry.title}",
            update_interval=timedelta(seconds=interval),
        )
        self.client = client

    @staticmethod
    def today() -> date:
        """Return today's date in Home Assistant's time zone."""
        return dt_util.now().date()

    async def _async_update_data(self) -> TududiData:
        try:
            open_tasks, done_tasks, projects, tags, notes, people = await asyncio.gather(
                self.client.get_tasks(),
                self.client.get_recently_done_tasks(RECENTLY_DONE_LIMIT),
                self.client.get_projects(),
                self.client.get_tags(),
                self.client.get_notes(),
                self.client.get_people(),
            )
        except TududiAuthError as err:
            raise ConfigEntryAuthFailed(str(err)) from err
        except TududiError as err:
            raise UpdateFailed(f"Error fetching tududi data: {err}") from err

        tasks = {t.uid: t for t in done_tasks}
        tasks.update({t.uid: t for t in open_tasks})
        _LOGGER.debug(
            "Fetched %d open and %d done tasks, %d projects, %d notes",
            len(open_tasks),
            len(done_tasks),
            len(projects),
            len(notes),
        )
        return TududiData(
            tasks=tasks,
            projects={p.uid: p for p in projects},
            tags=tags,
            notes={n.uid: n for n in notes},
            people={p.uid: p for p in people},
        )

    # ------------------------------------------------------------------ writes
    # Writes go to tududi first; the returned object is applied to the cache
    # immediately so entities update without waiting for the next poll.

    def _set_task(self, task: Task) -> None:
        tasks = dict(self.data.tasks)
        tasks[task.uid] = task
        self.async_set_updated_data(replace(self.data, tasks=tasks))

    def _remove_task(self, uid: str) -> None:
        tasks = dict(self.data.tasks)
        tasks.pop(uid, None)
        self.async_set_updated_data(replace(self.data, tasks=tasks))

    async def _call[T](self, awaitable: Awaitable[T]) -> T:
        try:
            return await awaitable
        except TududiAuthError as err:
            self.config_entry.async_start_reauth(self.hass)
            raise HomeAssistantError(f"tududi rejected the API key: {err}") from err
        except TududiNotFoundError as err:
            await self.async_request_refresh()
            raise HomeAssistantError(f"Task not found in tududi: {err}") from err
        except TududiError as err:
            raise HomeAssistantError(f"tududi request failed: {err}") from err

    async def async_create_task(self, name: str, **fields: Any) -> Task:
        """Create a task and add it to the cache."""
        task = await self._call(self.client.create_task(name, **fields))
        self._set_task(task)
        return task

    async def async_update_task(self, uid: str, **fields: Any) -> Task:
        """Update a task and refresh it in the cache."""
        task = await self._call(self.client.update_task(uid, **fields))
        self._set_task(task)
        return task

    async def async_complete_task(self, uid: str) -> Task:
        """Mark a task done."""
        task = await self._call(self.client.complete_task(uid))
        self._set_task(task)
        return task

    async def async_delete_tasks(self, uids: list[str]) -> None:
        """Delete tasks."""
        for uid in uids:
            await self._call(self.client.delete_task(uid))
            self._remove_task(uid)

    async def async_create_note(self, title: str, **fields: Any) -> Note:
        """Create a note and add it to the cache."""
        note = await self._call(self.client.create_note(title, **fields))
        notes = dict(self.data.notes)
        notes[note.uid] = note
        self.async_set_updated_data(replace(self.data, notes=notes))
        return note

    async def async_update_note(self, uid: str, **fields: Any) -> Note:
        """Update a note in tududi and the cache."""
        note = await self._call(self.client.update_note(uid, **fields))
        notes = dict(self.data.notes)
        notes[note.uid] = note
        self.async_set_updated_data(replace(self.data, notes=notes))
        return note

    async def async_delete_note(self, uid: str) -> None:
        """Delete a note."""
        await self._call(self.client.delete_note(uid))
        notes = dict(self.data.notes)
        notes.pop(uid, None)
        self.async_set_updated_data(replace(self.data, notes=notes))

    async def async_fetch_all_tasks(self) -> list[Task]:
        """Fetch all tasks including every completed one (not cached)."""
        return await self._call(self.client.get_tasks(include_done=True))

    def find_project(self, value: str) -> Project | None:
        """Find a project by uid or (case-insensitive) name."""
        if value in self.data.projects:
            return self.data.projects[value]
        wanted = value.strip().casefold()
        return next((p for p in self.data.projects.values() if p.name.casefold() == wanted), None)

    def find_person(self, value: str) -> Person | None:
        """Find a person by uid or (case-insensitive) name."""
        if value in self.data.people:
            return self.data.people[value]
        wanted = value.strip().casefold()
        return next((p for p in self.data.people.values() if p.name.casefold() == wanted), None)
