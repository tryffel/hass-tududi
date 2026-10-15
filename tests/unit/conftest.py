"""Shared fixtures for unit tests."""

from __future__ import annotations

import json
from collections.abc import Generator
from dataclasses import replace
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from homeassistant.const import CONF_API_KEY, CONF_URL
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.tududi.const import CONF_VERIFY_SSL, DEFAULT_OPTIONS, DOMAIN
from custom_components.tududi.models import (
    Note,
    Person,
    Profile,
    Project,
    Tag,
    Task,
    TaskStatus,
)

FIXTURES = Path(__file__).parent / "fixtures"
BASE_URL = "http://tududi.test"
API_KEY = "tt_test_key"


def load_fixture(name: str) -> Any:
    """Load a JSON fixture captured from tududi 1.9.1."""
    return json.loads((FIXTURES / f"{name}.json").read_text())


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom integrations in all tests."""
    return


@pytest.fixture
def profile_json() -> dict[str, Any]:
    """Return the captured profile response."""
    return load_fixture("profile")


@pytest.fixture
def tasks() -> list[Task]:
    """All captured tasks (open and done)."""
    return [Task.from_api(t) for t in load_fixture("tasks")["tasks"]]


@pytest.fixture
def mock_client(profile_json, tasks) -> Generator[MagicMock]:
    """Patch TududiClient so every instance serves the captured fixture data."""
    created = Task.from_api(
        {
            **load_fixture("tasks")["tasks"][0],
            "id": 999,
            "uid": "new-task-uid",
            "name": "New",
            "tags": [],
            "Project": None,
            "project_uid": None,
            "due_date": None,
            "note": None,
        }
    )
    with patch("custom_components.tududi.TududiClient", autospec=True) as cls:
        client = cls.return_value
        client.base_url = BASE_URL
        client.get_profile.return_value = Profile.from_api(profile_json)
        client.get_tasks.return_value = [t for t in tasks if not t.is_done]
        client.get_recently_done_tasks.return_value = [t for t in tasks if t.is_done]
        client.get_projects.return_value = [
            Project.from_api(p) for p in load_fixture("projects")["projects"]
        ]
        client.get_tags.return_value = [Tag.from_api(t) for t in load_fixture("tags")]
        client.get_notes.return_value = [Note.from_api(n) for n in load_fixture("notes")]
        client.get_people.return_value = [
            Person.from_api(p) for p in load_fixture("people")["people"]
        ]
        client.create_task.return_value = created

        def _updated(uid: str, **fields: Any) -> Task:
            task = next(t for t in tasks if t.uid == uid)
            values = {k: v for k, v in fields.items() if k in Task.__dataclass_fields__}
            return replace(task, **values)

        client.update_task.side_effect = _updated
        client.complete_task.side_effect = lambda uid: _updated(uid, status=TaskStatus.DONE)
        client.delete_task.return_value = None
        yield client


async def setup_entry(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    """Add and set up a config entry."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


@pytest.fixture
def config_entry(profile_json) -> MockConfigEntry:
    """Return a config entry for the captured profile."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Giorgio",
        unique_id=profile_json["uid"],
        data={CONF_URL: BASE_URL, CONF_API_KEY: API_KEY, CONF_VERIFY_SSL: True},
        options=dict(DEFAULT_OPTIONS),
    )
