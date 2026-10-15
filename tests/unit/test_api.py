"""Tests for the tududi API client."""

from __future__ import annotations

from datetime import date

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.test_util.aiohttp import AiohttpClientMocker

from custom_components.tududi.api import (
    TASK_FIELDS,
    TududiAuthError,
    TududiClient,
    TududiConnectionError,
    TududiError,
    TududiNotFoundError,
    build_payload,
    normalize_base_url,
)
from custom_components.tududi.models import TaskStatus

from .conftest import API_KEY, BASE_URL, load_fixture

API = f"{BASE_URL}/api/v1"


@pytest.fixture
async def client(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker):
    session = aioclient_mock.create_session(hass.loop)
    yield TududiClient(session, BASE_URL, API_KEY)
    await session.close()


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://todo.example.com", "https://todo.example.com"),
        ("https://todo.example.com/", "https://todo.example.com"),
        ("https://todo.example.com/api/v1/", "https://todo.example.com"),
        ("https://todo.example.com/api", "https://todo.example.com"),
        (" http://host:3002 ", "http://host:3002"),
    ],
)
def test_normalize_base_url(url: str, expected: str) -> None:
    assert normalize_base_url(url) == expected


def test_build_payload_converts_fields() -> None:
    payload = build_payload(
        {
            "name": "Pay",
            "due_date": date(2026, 10, 20),
            "tags": ["invoice"],
            "status": TaskStatus.DONE,
        },
        TASK_FIELDS,
    )
    assert payload == {
        "name": "Pay",
        "due_date": "2026-10-20",
        "tags": [{"name": "invoice"}],
        "status": 2,
    }


def test_build_payload_rejects_unknown_fields() -> None:
    with pytest.raises(ValueError, match="bogus"):
        build_payload({"bogus": 1}, TASK_FIELDS)


async def test_get_tasks_sends_bearer_and_params(
    client: TududiClient, aioclient_mock: AiohttpClientMocker
) -> None:
    aioclient_mock.get(f"{API}/tasks", json=load_fixture("tasks"))
    tasks = await client.get_tasks()
    assert len(tasks) == len(load_fixture("tasks")["tasks"])
    _, url, _, headers = aioclient_mock.mock_calls[0]
    assert url.query == {"type": "all"}
    assert headers["Authorization"] == f"Bearer {API_KEY}"


async def test_get_tasks_include_done(
    client: TududiClient, aioclient_mock: AiohttpClientMocker
) -> None:
    aioclient_mock.get(f"{API}/tasks", json={"tasks": []})
    await client.get_tasks(include_done=True)
    assert aioclient_mock.mock_calls[0][1].query == {"type": "all", "status": "all"}


async def test_create_and_complete_task(
    client: TududiClient, aioclient_mock: AiohttpClientMocker
) -> None:
    task_json = load_fixture("tasks")["tasks"][0]
    aioclient_mock.post(f"{API}/task", json=task_json)
    aioclient_mock.patch(f"{API}/task/{task_json['uid']}", json={**task_json, "status": 2})

    created = await client.create_task("Pay", tags=["invoice"], due_date=date(2026, 1, 2))
    assert created.uid == task_json["uid"]
    assert aioclient_mock.mock_calls[0][2] == {
        "name": "Pay",
        "tags": [{"name": "invoice"}],
        "due_date": "2026-01-02",
    }

    done = await client.complete_task(task_json["uid"])
    assert done.is_done
    assert aioclient_mock.mock_calls[1][2] == {"status": 2}


async def test_lists_parse_wrapped_and_bare_responses(
    client: TududiClient, aioclient_mock: AiohttpClientMocker
) -> None:
    aioclient_mock.get(f"{API}/projects", json=load_fixture("projects"))
    aioclient_mock.get(f"{API}/tags", json=load_fixture("tags"))
    aioclient_mock.get(f"{API}/notes", json=load_fixture("notes"))
    aioclient_mock.get(f"{API}/people", json=load_fixture("people"))
    assert len(await client.get_projects()) == 2
    assert await client.get_tags()
    assert await client.get_notes()
    assert len(await client.get_people()) >= 2


async def test_auth_error(client: TududiClient, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(f"{API}/profile", status=401, json={"error": "Invalid"})
    with pytest.raises(TududiAuthError):
        await client.get_profile()


async def test_not_found(client: TududiClient, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(f"{API}/task/missing", status=404, json={"error": "nope"})
    with pytest.raises(TududiNotFoundError):
        await client.get_task("missing")


async def test_server_error(client: TududiClient, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(f"{API}/tasks", status=500, text="boom")
    with pytest.raises(TududiError, match="500"):
        await client.get_tasks()


async def test_redirect_to_auth_proxy(
    client: TududiClient, aioclient_mock: AiohttpClientMocker
) -> None:
    aioclient_mock.get(
        f"{API}/profile", status=302, headers={"Location": "https://auth.example.com/"}
    )
    with pytest.raises(TududiConnectionError, match="authentication proxy"):
        await client.get_profile()


async def test_html_response_is_connection_error(
    client: TududiClient, aioclient_mock: AiohttpClientMocker
) -> None:
    aioclient_mock.get(
        f"{API}/profile", text="<html>login</html>", headers={"Content-Type": "text/html"}
    )
    with pytest.raises(TududiConnectionError, match="instead of JSON"):
        await client.get_profile()


async def test_timeout(client: TududiClient, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(f"{API}/profile", exc=TimeoutError())
    with pytest.raises(TududiConnectionError, match="Timeout"):
        await client.get_profile()
