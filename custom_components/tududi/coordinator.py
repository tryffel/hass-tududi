"""Data update coordinator for one tududi account."""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable
from dataclasses import dataclass, field, replace
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, HomeAssistantError
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .api import TududiAuthError, TududiClient, TududiError, TududiNotFoundError
from .const import (
    CONF_REMINDER_TAG,
    CONF_UPDATE_INTERVAL,
    DEFAULT_REMINDER_TAG,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
)
from .invoices import INVOICE_LINKS, InvoiceData, data_comments, format_comment
from .models import Comment, Note, Person, Project, Tag, Task

if TYPE_CHECKING:
    from . import TududiConfigEntry

_LOGGER = logging.getLogger(__name__)

RECENTLY_DONE_LIMIT = 20
DUE_SOON_DAYS = 7
# Invoice data lives in task comments, which need one request per task and do
# not change the task's updated_at; refresh them on this interval.
INVOICE_REFRESH_SECONDS = 600
INVOICE_FETCH_CONCURRENCY = 4


@dataclass(slots=True)
class TududiData:
    """Cached snapshot of one tududi account. Held in memory only."""

    tasks: dict[str, Task] = field(default_factory=dict)
    projects: dict[str, Project] = field(default_factory=dict)
    tags: list[Tag] = field(default_factory=list)
    notes: dict[str, Note] = field(default_factory=dict)
    people: dict[str, Person] = field(default_factory=dict)
    invoices: dict[str, InvoiceData] = field(default_factory=dict)

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
        # task uid -> (monotonic fetch time, data comments newest first)
        self._invoice_cache: dict[str, tuple[float, list[tuple[Comment, InvoiceData]]]] = {}

    @property
    def invoice_tag(self) -> str:
        """Tag that marks invoices (the reminder tag)."""
        return str(self.config_entry.options.get(CONF_REMINDER_TAG) or DEFAULT_REMINDER_TAG)

    def is_invoice(self, task: Task) -> bool:
        """Return True if the task carries the invoice tag."""
        tag = self.invoice_tag.casefold()
        return any(t.casefold() == tag for t in task.tags)

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
        invoices = await self._async_fetch_invoices(
            [t.uid for t in tasks.values() if self.is_invoice(t)]
        )
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
            invoices=invoices,
        )

    async def _async_fetch_invoices(self, uids: list[str]) -> dict[str, InvoiceData]:
        """Return invoice data for tasks, fetching stale or missing comments."""
        now = time.monotonic()
        stale = [
            uid
            for uid in uids
            if uid not in self._invoice_cache
            or now - self._invoice_cache[uid][0] > INVOICE_REFRESH_SECONDS
        ]
        semaphore = asyncio.Semaphore(INVOICE_FETCH_CONCURRENCY)

        async def fetch(uid: str) -> None:
            async with semaphore:
                try:
                    comments = await self.client.get_comments(uid)
                except TududiError as err:
                    _LOGGER.debug("Could not fetch comments of task %s: %s", uid, err)
                    return
            self._invoice_cache[uid] = (time.monotonic(), data_comments(comments))

        await asyncio.gather(*(fetch(uid) for uid in stale))
        wanted = set(uids)
        self._invoice_cache = {k: v for k, v in self._invoice_cache.items() if k in wanted}
        return {uid: found[0][1] for uid, (_, found) in self._invoice_cache.items() if found}

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
        links = self.hass.data.get(INVOICE_LINKS)
        for uid in uids:
            task = self.data.tasks.get(uid)
            if task and self.is_invoice(task):
                # tududi keeps comments of deleted tasks and reuses task ids,
                # so remove our data comments first.
                await self.async_set_invoice(uid, InvoiceData())
            await self._call(self.client.delete_task(uid))
            self._remove_task(uid)
            self._invoice_cache.pop(uid, None)
            if links:
                links.remove(uid)

    # ------------------------------------------------------------------ invoices

    def _client_for_author(self, email: str | None) -> TududiClient | None:
        """Return the client of the loaded account with this email, if any.

        Only a comment's author can delete it; when another household member's
        account is configured in this Home Assistant, use it for cleanup.
        """
        if not email:
            return None
        for entry in self.hass.config_entries.async_loaded_entries(DOMAIN):
            runtime = getattr(entry, "runtime_data", None)
            if runtime and runtime.profile.email.casefold() == email.casefold():
                return runtime.client
        return None

    async def async_set_invoice(self, uid: str, data: InvoiceData) -> InvoiceData | None:
        """Store invoice data on a task (new data comment, old ones removed)."""
        if data.amount is not None and not data.currency:
            data.currency = self.hass.config.currency
        existing = data_comments(await self._call(self.client.get_comments(uid)))
        current: list[tuple[Comment, InvoiceData]] = []
        if not data.is_empty:
            if existing:
                data.extra = {**existing[0][1].extra, **data.extra}
            comment = await self._call(self.client.create_comment(uid, format_comment(data)))
            current = [(comment, data)]

        for comment, old in existing:
            client = (
                self.client if comment.is_own else self._client_for_author(comment.author_email)
            )
            if client is None:
                # Cannot delete someone else's comment; the newest one wins.
                current.append((comment, old))
                continue
            try:
                await client.delete_comment(comment.uid)
            except TududiError as err:
                _LOGGER.warning("Could not delete old invoice data comment: %s", err)
                current.append((comment, old))

        self._invoice_cache[uid] = (time.monotonic(), current if not data.is_empty else [])
        invoices = dict(self.data.invoices)
        if data.is_empty:
            invoices.pop(uid, None)
        else:
            invoices[uid] = data
        self.async_set_updated_data(replace(self.data, invoices=invoices))
        return None if data.is_empty else data

    def find_previous_invoice(self, name: str, exclude: str | None = None) -> Task | None:
        """Latest invoice task with the same name (case-insensitive)."""
        wanted = name.strip().casefold()
        candidates = [
            t
            for t in self.data.tasks.values()
            if t.uid != exclude and self.is_invoice(t) and t.name.strip().casefold() == wanted
        ]
        candidates.sort(
            key=lambda t: (t.due_date or date.min, t.created_at or dt_util.utc_from_timestamp(0))
        )
        return candidates[-1] if candidates else None

    async def async_create_invoice(
        self,
        name: str,
        invoice: InvoiceData,
        *,
        previous_uid: str | None = None,
        auto_link: bool = True,
        **fields: Any,
    ) -> Task:
        """Create an invoice task, store its data and link it to the previous invoice."""
        if previous_uid is None and auto_link:
            previous = self.find_previous_invoice(name)
            previous_uid = previous.uid if previous else None
        tags = list(fields.pop("tags", None) or [])
        if not any(t.casefold() == self.invoice_tag.casefold() for t in tags):
            tags.append(self.invoice_tag)
        task = await self.async_create_task(name, tags=tags, **fields)
        if not invoice.is_empty:
            await self.async_set_invoice(task.uid, invoice)
        links = self.hass.data.get(INVOICE_LINKS)
        if links and previous_uid:
            links.set_previous(task.uid, previous_uid)
            self.async_update_listeners()
        return task

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
