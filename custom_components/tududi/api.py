"""Async client for the tududi REST API (v1.9.x)."""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime
from typing import Any

import aiohttp

from .models import Note, Person, Profile, Project, Tag, Task, TaskStatus

_LOGGER = logging.getLogger(__name__)

API_PATH = "/api/v1"
REQUEST_TIMEOUT = 20

# Writable task fields accepted by POST /task and PATCH /task/:uid.
TASK_FIELDS = frozenset(
    {
        "name",
        "due_date",
        "defer_until",
        "priority",
        "status",
        "note",
        "tags",
        "project_uid",
        "assigned_to",
        "parent_task_id",
    }
)
NOTE_FIELDS = frozenset({"title", "content", "project_uid", "tags"})


class TududiError(Exception):
    """Base error for tududi API failures."""


class TududiConnectionError(TududiError):
    """tududi could not be reached or returned an unexpected response."""


class TududiAuthError(TududiError):
    """The API key is invalid, expired or revoked."""


class TududiNotFoundError(TududiError):
    """The requested object does not exist or is not visible to this user."""


def normalize_base_url(url: str) -> str:
    """Normalize a user supplied tududi URL to the server root."""
    url = url.strip().rstrip("/")
    for suffix in (API_PATH, "/api"):
        if url.endswith(suffix):
            url = url[: -len(suffix)]
    return url


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def build_payload(fields: dict[str, Any], allowed: frozenset[str]) -> dict[str, Any]:
    """Build a request body from keyword fields, converting to tududi's formats."""
    unknown = set(fields) - allowed
    if unknown:
        raise ValueError(f"Unsupported fields: {', '.join(sorted(unknown))}")
    payload: dict[str, Any] = {}
    for key, value in fields.items():
        if key == "tags" and value is not None:
            payload["tags"] = [{"name": str(tag)} for tag in value]
        elif key == "status" and value is not None:
            payload["status"] = int(value)
        else:
            payload[key] = _serialize(value)
    return payload


def _items(data: Any, key: str) -> list[dict[str, Any]]:
    """Return a list from either a bare list or a wrapped {key: [...]} response."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get(key), list):
        return data[key]
    return []


class TududiClient:
    """Thin async wrapper around the tududi REST API."""

    def __init__(self, session: aiohttp.ClientSession, base_url: str, api_key: str) -> None:
        self._session = session
        self.base_url = normalize_base_url(base_url)
        self._api_key = api_key

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{API_PATH}{path}"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
        }
        try:
            async with asyncio.timeout(REQUEST_TIMEOUT):
                async with self._session.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    headers=headers,
                    allow_redirects=False,
                ) as resp:
                    return await self._handle_response(method, path, resp)
        except TimeoutError as err:
            raise TududiConnectionError(f"Timeout calling {method} {path}") from err
        except aiohttp.ClientError as err:
            raise TududiConnectionError(f"Error calling {method} {path}: {err}") from err

    async def _handle_response(self, method: str, path: str, resp: aiohttp.ClientResponse) -> Any:
        if resp.status == 401 or (resp.status == 403 and path == "/profile"):
            raise TududiAuthError("Invalid or expired API key")
        if 300 <= resp.status < 400:
            # Typically an auth proxy (e.g. Authelia) redirecting to its login page.
            raise TududiConnectionError(
                f"{method} {path} was redirected to {resp.headers.get('Location')}; "
                "is an authentication proxy in front of the tududi API?"
            )
        if resp.status == 404:
            raise TududiNotFoundError(f"{method} {path}: not found")
        if resp.status >= 400:
            text = await resp.text()
            raise TududiError(f"{method} {path} failed ({resp.status}): {text[:200]}")
        if resp.status == 204:
            return None
        content_type = resp.content_type or ""
        if content_type and "json" not in content_type:
            raise TududiConnectionError(
                f"{method} {path} returned {content_type} instead of JSON; "
                "is the URL correct and the API reachable without a login proxy?"
            )
        return await resp.json()

    # ------------------------------------------------------------------ profile / people

    async def get_profile(self) -> Profile:
        """Return the user that owns the API key. Also used to validate the key."""
        return Profile.from_api(await self._request("GET", "/profile"))

    async def get_people(self) -> list[Person]:
        """Return people that tasks can be assigned to."""
        data = await self._request("GET", "/people")
        return [Person.from_api(item) for item in _items(data, "people")]

    # ------------------------------------------------------------------ tasks

    async def get_tasks(self, *, include_done: bool = False) -> list[Task]:
        """Return all top-level tasks visible to this user (own, shared, assigned)."""
        params = {"type": "all"}
        if include_done:
            params["status"] = "all"
        data = await self._request("GET", "/tasks", params=params)
        return [Task.from_api(item) for item in _items(data, "tasks")]

    async def get_recently_done_tasks(self, limit: int = 20) -> list[Task]:
        """Return the most recently updated done/archived tasks."""
        data = await self._request(
            "GET",
            "/tasks",
            params={
                "type": "all",
                "status": "done",
                "limit": limit,
                "order_by": "updated_at:desc",
            },
        )
        return [Task.from_api(item) for item in _items(data, "tasks")]

    async def get_task(self, uid: str) -> Task:
        """Return a single task."""
        return Task.from_api(await self._request("GET", f"/task/{uid}"))

    async def get_subtasks(self, uid: str) -> list[Task]:
        """Return the subtasks of a task."""
        data = await self._request("GET", f"/task/{uid}/subtasks")
        return [Task.from_api(item) for item in _items(data, "subtasks")]

    async def create_task(self, name: str, **fields: Any) -> Task:
        """Create a task. Accepts the fields listed in TASK_FIELDS."""
        payload = build_payload({"name": name, **fields}, TASK_FIELDS)
        return Task.from_api(await self._request("POST", "/task", json=payload))

    async def update_task(self, uid: str, **fields: Any) -> Task:
        """Update a task. Only the given fields are changed."""
        payload = build_payload(fields, TASK_FIELDS)
        return Task.from_api(await self._request("PATCH", f"/task/{uid}", json=payload))

    async def complete_task(self, uid: str) -> Task:
        """Mark a task done."""
        return await self.update_task(uid, status=TaskStatus.DONE)

    async def reopen_task(self, uid: str) -> Task:
        """Mark a done task as not started."""
        return await self.update_task(uid, status=TaskStatus.NOT_STARTED)

    async def delete_task(self, uid: str) -> None:
        """Delete a task."""
        await self._request("DELETE", f"/task/{uid}")

    # ------------------------------------------------------------------ projects / tags

    async def get_projects(self) -> list[Project]:
        """Return projects visible to this user."""
        data = await self._request("GET", "/projects")
        return [Project.from_api(item) for item in _items(data, "projects")]

    async def get_tags(self) -> list[Tag]:
        """Return tags of this user."""
        data = await self._request("GET", "/tags")
        return [Tag.from_api(item) for item in _items(data, "tags")]

    # ------------------------------------------------------------------ notes

    async def get_notes(self) -> list[Note]:
        """Return notes visible to this user."""
        data = await self._request("GET", "/notes")
        return [Note.from_api(item) for item in _items(data, "notes")]

    async def create_note(self, title: str, **fields: Any) -> Note:
        """Create a note. Accepts the fields listed in NOTE_FIELDS."""
        payload = build_payload({"title": title, **fields}, NOTE_FIELDS)
        return Note.from_api(await self._request("POST", "/note", json=payload))

    async def update_note(self, uid: str, **fields: Any) -> Note:
        """Update a note."""
        payload = build_payload(fields, NOTE_FIELDS)
        return Note.from_api(await self._request("PATCH", f"/note/{uid}", json=payload))

    async def delete_note(self, uid: str) -> None:
        """Delete a note."""
        await self._request("DELETE", f"/note/{uid}")
