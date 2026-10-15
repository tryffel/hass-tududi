"""To-do list platform for Tududi."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import TududiConfigEntry
from .coordinator import TududiCoordinator
from .entity import TududiEntity
from .models import Task, TaskStatus

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: TududiConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the to-do list for a tududi account."""
    async_add_entities([TududiTodoList(entry.runtime_data.coordinator)])


def task_to_item(task: Task) -> TodoItem:
    """Convert a tududi task to a Home Assistant to-do item."""
    return TodoItem(
        uid=task.uid,
        summary=task.name,
        status=TodoItemStatus.COMPLETED if not task.is_open else TodoItemStatus.NEEDS_ACTION,
        due=task.due_date,
        description=task.note or None,
        completed=task.completed_at,
    )


def _sort_key(task: Task) -> tuple[Any, ...]:
    # Open tasks first, by due date (undated last), then newest first.
    created = task.created_at.timestamp() if task.created_at else 0
    return (not task.is_open, task.due_date or date.max, -created)


def _due_date(value: date | datetime | None) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    return value


class TududiTodoList(TududiEntity, TodoListEntity):
    """All tasks visible to a tududi account as a Home Assistant to-do list."""

    _attr_name = None
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(self, coordinator: TududiCoordinator) -> None:
        """Initialize the to-do list."""
        super().__init__(coordinator, "tasks")
        self._update_items()

    def _update_items(self) -> None:
        tasks = sorted(self.coordinator.data.tasks.values(), key=_sort_key)
        self._attr_todo_items = [task_to_item(t) for t in tasks]

    @callback
    def _handle_coordinator_update(self) -> None:
        self._update_items()
        super()._handle_coordinator_update()

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Create a task."""
        fields: dict[str, Any] = {}
        if item.due:
            fields["due_date"] = _due_date(item.due)
        if item.description:
            fields["note"] = item.description
        if item.status == TodoItemStatus.COMPLETED:
            fields["status"] = TaskStatus.DONE
        await self.coordinator.async_create_task(item.summary or "", **fields)

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Update a task; only changed fields are sent to tududi."""
        assert item.uid
        current = self.coordinator.data.tasks.get(item.uid)
        fields: dict[str, Any] = {}
        if current is None or item.summary != current.name:
            fields["name"] = item.summary
        if current is None or _due_date(item.due) != current.due_date:
            fields["due_date"] = _due_date(item.due)
        if current is None or (item.description or None) != (current.note or None):
            fields["note"] = item.description
        if item.status is not None:
            done = item.status == TodoItemStatus.COMPLETED
            if current is None or done == current.is_open:
                fields["status"] = TaskStatus.DONE if done else TaskStatus.NOT_STARTED
        if fields:
            await self.coordinator.async_update_task(item.uid, **fields)

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Delete tasks."""
        await self.coordinator.async_delete_tasks(uids)
