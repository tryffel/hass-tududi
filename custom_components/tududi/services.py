"""Services for the Tududi integration."""

from __future__ import annotations

from enum import IntEnum
from typing import Any

import probatio as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .coordinator import TududiCoordinator
from .invoices import INVOICE_LINKS, InvoiceData, parse_amount
from .models import Note, Priority, Task, TaskStatus
from .reminders import REMINDERS

ATTR_CONFIG_ENTRY_ID = "config_entry_id"
ATTR_UID = "uid"
ATTR_NAME = "name"
ATTR_DUE_DATE = "due_date"
ATTR_PRIORITY = "priority"
ATTR_STATUS = "status"
ATTR_PROJECT = "project"
ATTR_TAGS = "tags"
ATTR_NOTE = "note"
ATTR_ASSIGNED_TO = "assigned_to"
ATTR_TAG = "tag"
ATTR_TEXT = "text"
ATTR_INCLUDE_DONE = "include_done"
ATTR_TITLE = "title"
ATTR_CONTENT = "content"

SERVICE_CREATE_TASK = "create_task"
SERVICE_UPDATE_TASK = "update_task"
SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_FIND_TASKS = "find_tasks"
SERVICE_ADD_NOTE = "add_note"
SERVICE_RUN_REMINDERS = "run_reminders"
SERVICE_CREATE_INVOICE = "create_invoice"
SERVICE_UPDATE_INVOICE = "update_invoice"
ATTR_AMOUNT = "amount"
ATTR_CURRENCY = "currency"
ATTR_REFERENCE = "reference"
ATTR_LINK_PREVIOUS = "link_previous"
ATTR_FORCE = "force"

PRIORITIES = {p.name.lower(): p for p in Priority}
STATUSES = {
    s.name.lower(): s
    for s in (
        TaskStatus.NOT_STARTED,
        TaskStatus.IN_PROGRESS,
        TaskStatus.WAITING,
        TaskStatus.PLANNED,
        TaskStatus.DONE,
    )
}

_ENTRY = {vol.Required(ATTR_CONFIG_ENTRY_ID): cv.string}
# Fields shared by create and update. None clears a value on update.
_TASK_FIELDS = {
    vol.Optional(ATTR_DUE_DATE): vol.Any(None, cv.date),
    vol.Optional(ATTR_PRIORITY): vol.In(PRIORITIES),
    vol.Optional(ATTR_STATUS): vol.In(STATUSES),
    vol.Optional(ATTR_PROJECT): vol.Any(None, cv.string),
    vol.Optional(ATTR_TAGS): vol.All(cv.ensure_list, [cv.string]),
    vol.Optional(ATTR_NOTE): vol.Any(None, cv.string),
    vol.Optional(ATTR_ASSIGNED_TO): vol.Any(None, cv.string),
}

CREATE_TASK_SCHEMA = vol.Schema({**_ENTRY, vol.Required(ATTR_NAME): cv.string, **_TASK_FIELDS})
UPDATE_TASK_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_UID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
        **_TASK_FIELDS,
    }
)
COMPLETE_TASK_SCHEMA = vol.Schema({**_ENTRY, vol.Required(ATTR_UID): cv.string})
FIND_TASKS_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Optional(ATTR_TAG): cv.string,
        vol.Optional(ATTR_TEXT): cv.string,
        vol.Optional(ATTR_PROJECT): cv.string,
        vol.Optional(ATTR_INCLUDE_DONE, default=False): cv.boolean,
    }
)
ADD_NOTE_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_TITLE): cv.string,
        vol.Optional(ATTR_CONTENT, default=""): cv.string,
        vol.Optional(ATTR_PROJECT): cv.string,
        vol.Optional(ATTR_TAGS): vol.All(cv.ensure_list, [cv.string]),
    }
)


def _enum_name(enum: type[IntEnum], value: int | None) -> str | None:
    if value is None:
        return None
    try:
        return enum(value).name.lower()
    except TypeError, ValueError:
        return None


def _amount(value: Any) -> Any:
    if value is None or value == "":
        return None
    parsed = parse_amount(value)
    if parsed is None:
        raise vol.Invalid(f"Invalid amount: {value}")
    return parsed


_INVOICE_FIELDS = {
    vol.Optional(ATTR_AMOUNT): _amount,
    vol.Optional(ATTR_CURRENCY): vol.Any(None, cv.string),
    vol.Optional(ATTR_REFERENCE): vol.Any(None, cv.string),
}
CREATE_INVOICE_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_NAME): cv.string,
        vol.Required(ATTR_DUE_DATE): cv.date,
        vol.Optional(ATTR_PRIORITY): vol.In(PRIORITIES),
        vol.Optional(ATTR_PROJECT): vol.Any(None, cv.string),
        vol.Optional(ATTR_TAGS): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_NOTE): vol.Any(None, cv.string),
        vol.Optional(ATTR_ASSIGNED_TO): vol.Any(None, cv.string),
        vol.Optional(ATTR_LINK_PREVIOUS, default=True): cv.boolean,
        **_INVOICE_FIELDS,
    }
)
UPDATE_INVOICE_SCHEMA = vol.Schema({**_ENTRY, vol.Required(ATTR_UID): cv.string, **_INVOICE_FIELDS})

RUN_REMINDERS_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
        vol.Optional(ATTR_FORCE, default=False): cv.boolean,
    }
)


def task_response(task: Task) -> dict[str, Any]:
    """Serialize a task for service responses."""
    return {
        "uid": task.uid,
        "name": task.name,
        "status": _enum_name(TaskStatus, task.status),
        "done": task.is_done,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "priority": _enum_name(Priority, task.priority),
        "tags": task.tags,
        "note": task.note,
        "project_uid": task.project_uid,
        "project": task.project_name,
        "assigned_to": task.assigned_to,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


def _invoice_from(data: dict[str, Any]) -> InvoiceData:
    return InvoiceData(
        amount=data.get(ATTR_AMOUNT),
        currency=(data.get(ATTR_CURRENCY) or "").strip().upper() or None,
        reference=(data.get(ATTR_REFERENCE) or "").strip() or None,
    )


def _with_invoice(coordinator: TududiCoordinator, task: Task) -> dict[str, Any]:
    response = task_response(task)
    if coordinator.is_invoice(task):
        data = coordinator.data.invoices.get(task.uid)
        response["invoice"] = data.as_dict() if data else None
    return response


def note_response(note: Note) -> dict[str, Any]:
    """Serialize a note for service responses."""
    return {
        "uid": note.uid,
        "title": note.title,
        "content": note.content,
        "project_uid": note.project_uid,
        "tags": note.tags,
    }


def _coordinator(hass: HomeAssistant, call: ServiceCall) -> TududiCoordinator:
    entry_id = call.data[ATTR_CONFIG_ENTRY_ID]
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or entry.domain != DOMAIN:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="entry_not_found",
            translation_placeholders={"entry_id": entry_id},
        )
    if entry.state is not ConfigEntryState.LOADED:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="entry_not_loaded",
            translation_placeholders={"name": entry.title},
        )
    coordinator: TududiCoordinator = entry.runtime_data.coordinator
    return coordinator


def _project_uid(coordinator: TududiCoordinator, value: str | None) -> str | None:
    if value is None or value == "":
        return None
    project = coordinator.find_project(value)
    if project is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="project_not_found",
            translation_placeholders={"project": value},
        )
    return project.uid


def _person_uid(coordinator: TududiCoordinator, value: str | None) -> str | None:
    if value is None or value == "":
        return None
    person = coordinator.find_person(value)
    if person is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="person_not_found",
            translation_placeholders={"person": value},
        )
    return person.uid


def _task_fields(coordinator: TududiCoordinator, data: dict[str, Any]) -> dict[str, Any]:
    """Translate service data to TududiClient task fields."""
    fields: dict[str, Any] = {}
    if ATTR_NAME in data:
        fields["name"] = data[ATTR_NAME]
    if ATTR_DUE_DATE in data:
        fields["due_date"] = data[ATTR_DUE_DATE]
    if ATTR_PRIORITY in data:
        fields["priority"] = PRIORITIES[data[ATTR_PRIORITY]]
    if ATTR_STATUS in data:
        fields["status"] = STATUSES[data[ATTR_STATUS]]
    if ATTR_PROJECT in data:
        fields["project_uid"] = _project_uid(coordinator, data[ATTR_PROJECT])
    if ATTR_TAGS in data:
        fields["tags"] = data[ATTR_TAGS]
    if ATTR_NOTE in data:
        fields["note"] = data[ATTR_NOTE]
    if ATTR_ASSIGNED_TO in data:
        fields["assigned_to"] = _person_uid(coordinator, data[ATTR_ASSIGNED_TO])
    return fields


def _matches(task: Task, tag: str | None, text: str | None, project_uid: str | None) -> bool:
    if tag and tag.casefold() not in {t.casefold() for t in task.tags}:
        return False
    if project_uid and task.project_uid != project_uid:
        return False
    if text:
        needle = text.casefold()
        haystack = f"{task.name}\n{task.note or ''}".casefold()
        if needle not in haystack:
            return False
    return True


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register Tududi services."""

    async def create_task(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        data = dict(call.data)
        name = data.pop(ATTR_NAME)
        task = await coordinator.async_create_task(name, **_task_fields(coordinator, data))
        return {"task": _with_invoice(coordinator, task)}

    async def update_task(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        fields = _task_fields(coordinator, dict(call.data))
        task = await coordinator.async_update_task(call.data[ATTR_UID], **fields)
        return {"task": _with_invoice(coordinator, task)}

    async def complete_task(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        task = await coordinator.async_complete_task(call.data[ATTR_UID])
        return {"task": _with_invoice(coordinator, task)}

    async def find_tasks(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        project_uid = _project_uid(coordinator, call.data.get(ATTR_PROJECT))
        if call.data[ATTR_INCLUDE_DONE]:
            tasks = await coordinator.async_fetch_all_tasks()
        else:
            tasks = coordinator.data.open_tasks
        found = [
            t
            for t in tasks
            if _matches(t, call.data.get(ATTR_TAG), call.data.get(ATTR_TEXT), project_uid)
        ]
        found.sort(key=lambda t: (t.due_date is None, t.due_date, t.name.casefold()))
        return {"tasks": [_with_invoice(coordinator, t) for t in found]}

    async def add_note(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        fields: dict[str, Any] = {"content": call.data[ATTR_CONTENT]}
        if call.data.get(ATTR_PROJECT):
            fields["project_uid"] = _project_uid(coordinator, call.data[ATTR_PROJECT])
        if ATTR_TAGS in call.data:
            fields["tags"] = call.data[ATTR_TAGS]
        note = await coordinator.async_create_note(call.data[ATTR_TITLE], **fields)
        return {"note": note_response(note)}

    async def create_invoice(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        data = dict(call.data)
        name = data.pop(ATTR_NAME)
        fields = _task_fields(coordinator, data)
        task = await coordinator.async_create_invoice(
            name,
            _invoice_from(call.data),
            auto_link=call.data[ATTR_LINK_PREVIOUS],
            **fields,
        )
        links = hass.data[INVOICE_LINKS]
        return {
            "task": _with_invoice(coordinator, task),
            "previous_uid": links.previous.get(task.uid),
        }

    async def update_invoice(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass, call)
        data = await coordinator.async_set_invoice(call.data[ATTR_UID], _invoice_from(call.data))
        return {"invoice": data.as_dict() if data else None}

    async def run_reminders(call: ServiceCall) -> ServiceResponse:
        manager = hass.data[REMINDERS]
        if ATTR_CONFIG_ENTRY_ID in call.data:
            entries = [_coordinator(hass, call).config_entry]
        else:
            entries = hass.config_entries.async_loaded_entries(DOMAIN)
        results: dict[str, Any] = {}
        for entry in entries:
            results[entry.entry_id] = {
                "account": entry.title,
                **await manager.async_run(entry, force=call.data[ATTR_FORCE]),
            }
        return {"accounts": results}

    for name, handler, schema, response in (
        (SERVICE_CREATE_TASK, create_task, CREATE_TASK_SCHEMA, SupportsResponse.OPTIONAL),
        (SERVICE_UPDATE_TASK, update_task, UPDATE_TASK_SCHEMA, SupportsResponse.OPTIONAL),
        (SERVICE_COMPLETE_TASK, complete_task, COMPLETE_TASK_SCHEMA, SupportsResponse.OPTIONAL),
        (SERVICE_FIND_TASKS, find_tasks, FIND_TASKS_SCHEMA, SupportsResponse.ONLY),
        (SERVICE_ADD_NOTE, add_note, ADD_NOTE_SCHEMA, SupportsResponse.OPTIONAL),
        (SERVICE_RUN_REMINDERS, run_reminders, RUN_REMINDERS_SCHEMA, SupportsResponse.OPTIONAL),
        (SERVICE_CREATE_INVOICE, create_invoice, CREATE_INVOICE_SCHEMA, SupportsResponse.OPTIONAL),
        (SERVICE_UPDATE_INVOICE, update_invoice, UPDATE_INVOICE_SCHEMA, SupportsResponse.OPTIONAL),
    ):
        hass.services.async_register(
            DOMAIN, name, handler, schema=schema, supports_response=response
        )
