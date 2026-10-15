"""Sensor platform for Tududi: counts of overdue and upcoming tasks."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import TududiConfigEntry
from .coordinator import TududiCoordinator, TududiData
from .entity import TududiEntity
from .models import Task

PARALLEL_UPDATES = 0

ATTR_TASKS = "tasks"


@dataclass(frozen=True, kw_only=True)
class TududiSensorDescription(SensorEntityDescription):
    """Describes a task count sensor."""

    tasks_fn: Callable[[TududiData, date], list[Task]]


SENSORS: tuple[TududiSensorDescription, ...] = (
    TududiSensorDescription(
        key="overdue",
        translation_key="overdue",
        tasks_fn=lambda data, today: data.overdue(today),
    ),
    TududiSensorDescription(
        key="due_today",
        translation_key="due_today",
        tasks_fn=lambda data, today: data.due_today(today),
    ),
    TududiSensorDescription(
        key="due_this_week",
        translation_key="due_this_week",
        tasks_fn=lambda data, today: data.due_this_week(today),
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: TududiConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up task count sensors for a tududi account."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities(TududiCountSensor(coordinator, desc) for desc in SENSORS)


def task_summary(task: Task) -> dict[str, Any]:
    """Compact task representation for attributes. Never includes the note."""
    return {
        "uid": task.uid,
        "name": task.name,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "tags": task.tags,
        "project": task.project_name,
        "assigned_to": task.assigned_to,
    }


class TududiCountSensor(TududiEntity, SensorEntity):
    """Number of tasks in a due date bucket. The task list is not recorded."""

    entity_description: TududiSensorDescription
    _attr_native_unit_of_measurement = "tasks"
    _unrecorded_attributes = frozenset({ATTR_TASKS})

    def __init__(self, coordinator: TududiCoordinator, desc: TududiSensorDescription) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, desc.key)
        self.entity_description = desc

    def _tasks(self) -> list[Task]:
        return self.entity_description.tasks_fn(self.coordinator.data, self.coordinator.today())

    @property
    def native_value(self) -> int:
        """Return the number of tasks."""
        return len(self._tasks())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the tasks (for dashboards/automations; excluded from history)."""
        return {ATTR_TASKS: [task_summary(t) for t in self._tasks()]}
