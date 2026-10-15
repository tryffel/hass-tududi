"""Typed models for tududi API objects (v1.9.x)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import IntEnum
from typing import Any


class TaskStatus(IntEnum):
    """Task status values used by tududi."""

    NOT_STARTED = 0
    IN_PROGRESS = 1
    DONE = 2
    ARCHIVED = 3
    WAITING = 4
    CANCELLED = 5
    PLANNED = 6


CLOSED_STATUSES = frozenset({TaskStatus.DONE, TaskStatus.ARCHIVED, TaskStatus.CANCELLED})


class Priority(IntEnum):
    """Task priority values used by tududi."""

    LOW = 0
    MEDIUM = 1
    HIGH = 2


def parse_datetime(value: Any) -> datetime | None:
    """Parse an ISO timestamp returned by tududi."""
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_date(value: Any) -> date | None:
    """Parse a tududi date field, which may be a date or a full timestamp."""
    if not value or not isinstance(value, str):
        return None
    if len(value) == 10:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    parsed = parse_datetime(value)
    return parsed.date() if parsed else None


def _tag_names(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    names = []
    for tag in raw:
        if isinstance(tag, dict) and tag.get("name"):
            names.append(str(tag["name"]))
        elif isinstance(tag, str):
            names.append(tag)
    return names


def _int(value: Any, default: int | None = None) -> int | None:
    try:
        return int(value)
    except TypeError, ValueError:
        return default


@dataclass(slots=True)
class Task:
    """A tududi task."""

    id: int
    uid: str
    name: str
    status: int = TaskStatus.NOT_STARTED
    priority: int | None = None
    due_date: date | None = None
    defer_until: datetime | None = None
    note: str | None = None
    tags: list[str] = field(default_factory=list)
    project_uid: str | None = None
    project_name: str | None = None
    area_uid: str | None = None
    assigned_to: str | None = None
    owner_id: int | None = None
    parent_task_uid: str | None = None
    recurrence_type: str | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def is_done(self) -> bool:
        """Return True when the task is completed."""
        return self.status == TaskStatus.DONE

    @property
    def is_open(self) -> bool:
        """Return True when the task still needs action."""
        return self.status not in CLOSED_STATUSES

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Task:
        """Build a task from an API response object."""
        project = data.get("Project") or {}
        parent = data.get("parent_task") or {}
        return cls(
            id=int(data["id"]),
            uid=str(data["uid"]),
            name=str(data.get("name") or data.get("original_name") or ""),
            status=_int(data.get("status"), TaskStatus.NOT_STARTED) or 0,
            priority=_int(data.get("priority")),
            due_date=parse_date(data.get("due_date")),
            defer_until=parse_datetime(data.get("defer_until")),
            note=data.get("note"),
            tags=_tag_names(data.get("tags") or data.get("Tags")),
            project_uid=data.get("project_uid") or project.get("uid"),
            project_name=project.get("name"),
            area_uid=data.get("area_uid"),
            assigned_to=data.get("assigned_to"),
            owner_id=_int(data.get("user_id")),
            parent_task_uid=parent.get("uid") if isinstance(parent, dict) else None,
            recurrence_type=data.get("recurrence_type"),
            completed_at=parse_datetime(data.get("completed_at")),
            created_at=parse_datetime(data.get("created_at")),
            updated_at=parse_datetime(data.get("updated_at")),
        )


@dataclass(slots=True)
class Project:
    """A tududi project."""

    id: int
    uid: str
    name: str
    status: str | None = None
    area_id: int | None = None
    owner_uid: str | None = None
    tags: list[str] = field(default_factory=list)

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Project:
        """Build a project from an API response object."""
        user = data.get("User") or {}
        return cls(
            id=int(data["id"]),
            uid=str(data["uid"]),
            name=str(data.get("name") or ""),
            status=data.get("status"),
            area_id=_int(data.get("area_id")),
            owner_uid=user.get("uid"),
            tags=_tag_names(data.get("tags") or data.get("Tags")),
        )


@dataclass(slots=True)
class Tag:
    """A tududi tag."""

    uid: str
    name: str
    tag_type: str = "user"

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Tag:
        """Build a tag from an API response object."""
        return cls(
            uid=str(data["uid"]),
            name=str(data.get("name") or ""),
            tag_type=str(data.get("tag_type") or "user"),
        )


@dataclass(slots=True)
class Note:
    """A tududi note."""

    id: int
    uid: str
    title: str
    content: str = ""
    project_uid: str | None = None
    project_name: str | None = None
    tags: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Note:
        """Build a note from an API response object."""
        project = data.get("Project") or {}
        return cls(
            id=int(data["id"]),
            uid=str(data["uid"]),
            title=str(data.get("title") or ""),
            content=str(data.get("content") or ""),
            project_uid=data.get("project_uid") or project.get("uid"),
            project_name=project.get("name"),
            tags=_tag_names(data.get("tags") or data.get("Tags")),
            created_at=parse_datetime(data.get("created_at")),
            updated_at=parse_datetime(data.get("updated_at")),
        )


@dataclass(slots=True)
class Comment:
    """A comment on a tududi task."""

    uid: str
    body: str
    is_own: bool = False
    author_email: str | None = None
    created_at: datetime | None = None
    deleted: bool = False

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Comment:
        """Build a comment from an API response object."""
        author = data.get("author") or {}
        return cls(
            uid=str(data["uid"]),
            body=str(data.get("body") or ""),
            is_own=bool(data.get("is_own")),
            author_email=author.get("email"),
            created_at=parse_datetime(data.get("created_at")),
            # tududi soft-deletes comments and still lists them.
            deleted=data.get("deleted_at") is not None,
        )


@dataclass(slots=True)
class Person:
    """A tududi person (household member or contact) that tasks can be assigned to."""

    uid: str
    name: str
    email: str | None = None
    linked_user_id: int | None = None
    is_self: bool = False
    kind: str | None = None

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Person:
        """Build a person from an API response object."""
        return cls(
            uid=str(data["uid"]),
            name=str(data.get("name") or ""),
            email=data.get("email"),
            linked_user_id=_int(data.get("linked_user_id")),
            is_self=bool(data.get("is_self")),
            kind=data.get("kind"),
        )


@dataclass(slots=True)
class Profile:
    """The tududi user that owns the API key."""

    uid: str
    email: str
    name: str | None = None
    surname: str | None = None
    timezone: str | None = None

    @property
    def display_name(self) -> str:
        """Return a human friendly name."""
        full = " ".join(part for part in (self.name, self.surname) if part)
        return full or self.email

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Profile:
        """Build a profile from an API response object."""
        return cls(
            uid=str(data["uid"]),
            email=str(data.get("email") or ""),
            name=data.get("name"),
            surname=data.get("surname"),
            timezone=data.get("timezone"),
        )
