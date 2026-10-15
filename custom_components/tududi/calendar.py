"""Calendar platform for Tududi: open tasks as all-day events on their due date."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import TududiConfigEntry
from .coordinator import TududiCoordinator
from .entity import TududiEntity
from .models import Task

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: TududiConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the calendar for a tududi account."""
    async_add_entities([TududiCalendar(entry.runtime_data.coordinator)])


def task_to_event(task: Task) -> CalendarEvent:
    """Convert a task with a due date to an all-day calendar event."""
    assert task.due_date
    return CalendarEvent(
        start=task.due_date,
        end=task.due_date + timedelta(days=1),
        summary=task.name,
        description=task.note or None,
        uid=task.uid,
    )


class TududiCalendar(TududiEntity, CalendarEntity):
    """Open tududi tasks with a due date."""

    _attr_name = None
    # Keep task contents out of the recorder; only the on/off state is recorded.
    _unrecorded_attributes = frozenset(
        {"message", "description", "location", "start_time", "end_time", "all_day"}
    )

    def __init__(self, coordinator: TududiCoordinator) -> None:
        """Initialize the calendar."""
        super().__init__(coordinator, "calendar")

    def _dated_open_tasks(self) -> list[Task]:
        return sorted(
            (t for t in self.coordinator.data.open_tasks if t.due_date),
            key=lambda t: (t.due_date, t.name.lower()),
        )

    @property
    def event(self) -> CalendarEvent | None:
        """Return the current or next upcoming task (today or later)."""
        today = self.coordinator.today()
        for task in self._dated_open_tasks():
            assert task.due_date
            if task.due_date >= today:
                return task_to_event(task)
        return None

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        """Return tasks due within the requested range."""
        start: date = start_date.date()
        end: date = end_date.date()
        return [
            task_to_event(t)
            for t in self._dated_open_tasks()
            if t.due_date and start <= t.due_date <= end
        ]
