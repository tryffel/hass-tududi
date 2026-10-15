"""Websocket API used by the Tududi panel."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from functools import wraps
from typing import TYPE_CHECKING, Any

import probatio as vol
from homeassistant.auth.models import User
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_HA_USER,
    CONF_REMINDER_DAYS_BEFORE,
    CONF_REMINDER_TAG,
    DEFAULT_OPTIONS,
    DOMAIN,
)
from .invoices import INVOICE_LINKS, InvoiceData, parse_amount
from .models import Note, Task

if TYPE_CHECKING:
    from . import TududiConfigEntry
    from .coordinator import TududiCoordinator

type Handler = Callable[
    [HomeAssistant, websocket_api.ActiveConnection, dict[str, Any], "TududiConfigEntry"],
    Awaitable[None],
]

TASK_FIELDS_SCHEMA = {
    vol.Optional("name"): cv.string,
    vol.Optional("due_date"): vol.Any(None, cv.date),
    vol.Optional("priority"): vol.Any(None, vol.All(int, vol.Range(min=0, max=2))),
    vol.Optional("status"): vol.All(int, vol.Range(min=0, max=6)),
    vol.Optional("project_uid"): vol.Any(None, cv.string),
    vol.Optional("tags"): [cv.string],
    vol.Optional("note"): vol.Any(None, str),
    vol.Optional("assigned_to"): vol.Any(None, cv.string),
}
NOTE_FIELDS_SCHEMA = {
    vol.Optional("title"): cv.string,
    vol.Optional("content"): str,
    vol.Optional("project_uid"): vol.Any(None, cv.string),
    vol.Optional("tags"): [cv.string],
}


def visible_entries(hass: HomeAssistant, user: User) -> list[TududiConfigEntry]:
    """Loaded entries the user may use: linked to them, or unlinked for admins."""
    entries = []
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        linked = entry.options.get(CONF_HA_USER)
        if linked == user.id or (linked is None and user.is_admin):
            entries.append(entry)
    return entries


def _date(value: Any) -> str | None:
    return value.isoformat() if value else None


def serialize_task(task: Task) -> dict[str, Any]:
    """Serialize a task for the panel (includes the note)."""
    return {
        "uid": task.uid,
        "name": task.name,
        "status": task.status,
        "done": task.is_done,
        "open": task.is_open,
        "priority": task.priority,
        "due_date": _date(task.due_date),
        "note": task.note or "",
        "tags": task.tags,
        "project_uid": task.project_uid,
        "assigned_to": task.assigned_to,
        "owner_id": task.owner_id,
        "recurring": bool(task.recurrence_type and task.recurrence_type != "none"),
        "completed_at": _date(task.completed_at),
        "created_at": _date(task.created_at),
    }


def serialize_note(note: Note) -> dict[str, Any]:
    """Serialize a note for the panel."""
    return {
        "uid": note.uid,
        "title": note.title,
        "content": note.content,
        "project_uid": note.project_uid,
        "tags": note.tags,
        "updated_at": _date(note.updated_at),
    }


def _invoice_info(
    hass: HomeAssistant, coordinator: TududiCoordinator, task: Task
) -> dict[str, Any] | None:
    if not coordinator.is_invoice(task):
        return None
    links = hass.data.get(INVOICE_LINKS)
    data = coordinator.data.invoices.get(task.uid)
    return {
        **(data.as_dict() if data else {"amount": None, "currency": None, "reference": None}),
        "previous_uid": links.previous.get(task.uid) if links else None,
        "next_uid": links.next_of(task.uid) if links else None,
    }


def snapshot(hass: HomeAssistant, entry: TududiConfigEntry) -> dict[str, Any]:
    """Full state of one account for the panel."""
    coordinator: TududiCoordinator = entry.runtime_data.coordinator
    data = coordinator.data
    options = {**DEFAULT_OPTIONS, **entry.options}
    self_person = data.self_person
    return {
        "entry_id": entry.entry_id,
        "today": coordinator.today().isoformat(),
        "currency": hass.config.currency,
        "reminder_tag": options[CONF_REMINDER_TAG],
        "reminder_days_before": options[CONF_REMINDER_DAYS_BEFORE],
        "self_person": self_person.uid if self_person else None,
        "self_user_id": data.self_user_id,
        "tasks": [
            {**serialize_task(t), "invoice": _invoice_info(hass, coordinator, t)}
            for t in data.tasks.values()
        ],
        "projects": sorted(
            ({"uid": p.uid, "name": p.name} for p in data.projects.values()),
            key=lambda p: p["name"].casefold(),
        ),
        "tags": sorted({t.name for t in data.tags if t.tag_type == "user"}, key=str.casefold),
        "notes": [serialize_note(n) for n in data.notes.values()],
        "people": [
            {"uid": p.uid, "name": p.name, "is_self": p.is_self} for p in data.people.values()
        ],
        "last_update_success": coordinator.last_update_success,
    }


def entry_command(handler: Handler) -> Callable[..., Awaitable[None]]:
    """Resolve `entry_id`, check that the user may use it, map errors."""

    @wraps(handler)
    async def wrapper(
        hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
    ) -> None:
        entry = hass.config_entries.async_get_entry(msg["entry_id"])
        if (
            entry is None
            or entry.domain != DOMAIN
            or entry.state is not ConfigEntryState.LOADED
            or entry not in visible_entries(hass, connection.user)
        ):
            connection.send_error(msg["id"], "not_found", "Tududi account not found")
            return
        try:
            await handler(hass, connection, msg, entry)
        except HomeAssistantError as err:
            connection.send_error(msg["id"], "tududi_error", str(err))

    return wrapper


def _entry_schema(type_: str, extra: dict[Any, Any] | None = None) -> dict[Any, Any]:
    return {
        vol.Required("type"): type_,
        vol.Required("entry_id"): cv.string,
        **(extra or {}),
    }


@websocket_api.websocket_command({vol.Required("type"): "tududi/entries"})
@callback
def ws_entries(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """List the tududi accounts visible to the current user."""
    user_id = connection.user.id
    entries = visible_entries(hass, connection.user)
    connection.send_result(
        msg["id"],
        [
            {
                "entry_id": e.entry_id,
                "title": e.title,
                "linked": e.options.get(CONF_HA_USER) == user_id,
            }
            for e in sorted(
                entries, key=lambda e: (e.options.get(CONF_HA_USER) != user_id, e.title)
            )
        ],
    )


@websocket_api.websocket_command(_entry_schema("tududi/subscribe"))
@websocket_api.async_response
@entry_command
async def ws_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Send a snapshot now and after every update of the account's data."""
    coordinator = entry.runtime_data.coordinator

    @callback
    def send() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], snapshot(hass, entry)))

    connection.subscriptions[msg["id"]] = coordinator.async_add_listener(send)
    connection.send_result(msg["id"])
    send()


@websocket_api.websocket_command(_entry_schema("tududi/refresh"))
@websocket_api.async_response
@entry_command
async def ws_refresh(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Fetch fresh data from tududi now."""
    await entry.runtime_data.coordinator.async_refresh()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    _entry_schema("tududi/task/create", {**TASK_FIELDS_SCHEMA, vol.Required("name"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_task_create(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Create a task."""
    fields = _fields(msg, TASK_FIELDS_SCHEMA)
    name = fields.pop("name")
    task = await entry.runtime_data.coordinator.async_create_task(name, **fields)
    connection.send_result(msg["id"], serialize_task(task))


@websocket_api.websocket_command(
    _entry_schema("tududi/task/update", {**TASK_FIELDS_SCHEMA, vol.Required("uid"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_task_update(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Update task fields."""
    fields = _fields(msg, TASK_FIELDS_SCHEMA)
    task = await entry.runtime_data.coordinator.async_update_task(msg["uid"], **fields)
    connection.send_result(msg["id"], serialize_task(task))


@websocket_api.websocket_command(
    _entry_schema("tududi/task/delete", {vol.Required("uid"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_task_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Delete a task."""
    await entry.runtime_data.coordinator.async_delete_tasks([msg["uid"]])
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    _entry_schema("tududi/note/create", {**NOTE_FIELDS_SCHEMA, vol.Required("title"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_note_create(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Create a note."""
    fields = _fields(msg, NOTE_FIELDS_SCHEMA)
    title = fields.pop("title")
    note = await entry.runtime_data.coordinator.async_create_note(title, **fields)
    connection.send_result(msg["id"], serialize_note(note))


@websocket_api.websocket_command(
    _entry_schema("tududi/note/update", {**NOTE_FIELDS_SCHEMA, vol.Required("uid"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_note_update(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Update a note."""
    fields = _fields(msg, NOTE_FIELDS_SCHEMA)
    note = await entry.runtime_data.coordinator.async_update_note(msg["uid"], **fields)
    connection.send_result(msg["id"], serialize_note(note))


@websocket_api.websocket_command(
    _entry_schema("tududi/note/delete", {vol.Required("uid"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_note_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Delete a note."""
    await entry.runtime_data.coordinator.async_delete_note(msg["uid"])
    connection.send_result(msg["id"])


INVOICE_DATA_SCHEMA = {
    vol.Optional("amount"): vol.Any(None, str, int, float),
    vol.Optional("currency"): vol.Any(None, cv.string),
    vol.Optional("reference"): vol.Any(None, str),
}


def _invoice_data(msg: dict[str, Any]) -> InvoiceData:
    amount = msg.get("amount")
    parsed = parse_amount(amount)
    if amount not in (None, "") and parsed is None:
        raise vol.Invalid(f"Invalid amount: {amount}")
    return InvoiceData(
        amount=parsed,
        currency=(msg.get("currency") or "").strip().upper() or None,
        reference=(msg.get("reference") or "").strip() or None,
    )


@websocket_api.websocket_command(
    _entry_schema(
        "tududi/invoice/create",
        {
            **TASK_FIELDS_SCHEMA,
            **INVOICE_DATA_SCHEMA,
            vol.Required("name"): cv.string,
            vol.Required("due_date"): cv.date,
            vol.Optional("previous_uid"): vol.Any(None, cv.string),
        },
    )
)
@websocket_api.async_response
@entry_command
async def ws_invoice_create(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Create an invoice task with its invoice data."""
    try:
        invoice = _invoice_data(msg)
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    fields = _fields(msg, TASK_FIELDS_SCHEMA)
    name = fields.pop("name")
    task = await entry.runtime_data.coordinator.async_create_invoice(
        name,
        invoice,
        previous_uid=msg.get("previous_uid"),
        auto_link="previous_uid" not in msg,
        **fields,
    )
    connection.send_result(msg["id"], serialize_task(task))


@websocket_api.websocket_command(
    _entry_schema("tududi/invoice/update", {**INVOICE_DATA_SCHEMA, vol.Required("uid"): cv.string})
)
@websocket_api.async_response
@entry_command
async def ws_invoice_update(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    entry: TududiConfigEntry,
) -> None:
    """Replace the invoice data of a task (all fields; empty clears)."""
    try:
        invoice = _invoice_data(msg)
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    data = await entry.runtime_data.coordinator.async_set_invoice(msg["uid"], invoice)
    connection.send_result(msg["id"], data.as_dict() if data else None)


def _fields(msg: dict[str, Any], schema: dict[Any, Any]) -> dict[str, Any]:
    keys = {str(k) for k in schema}
    return {k: v for k, v in msg.items() if k in keys}


@callback
def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    for command in (
        ws_entries,
        ws_subscribe,
        ws_refresh,
        ws_task_create,
        ws_task_update,
        ws_task_delete,
        ws_note_create,
        ws_note_update,
        ws_note_delete,
        ws_invoice_create,
        ws_invoice_update,
    ):
        websocket_api.async_register_command(hass, command)
