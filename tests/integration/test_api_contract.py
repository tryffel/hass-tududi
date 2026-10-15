"""Contract tests for TududiClient against a real tududi 1.9.1 instance."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import pytest

from custom_components.tududi.api import (
    TududiAuthError,
    TududiClient,
    TududiNotFoundError,
)
from custom_components.tududi.models import TaskStatus

from .conftest import TUDUDI_URL

pytestmark = pytest.mark.integration


def _name(prefix: str) -> str:
    return f"[it] {prefix} {uuid4().hex[:6]}"


async def test_profile(giorgio: TududiClient, giulia: TududiClient) -> None:
    assert (await giorgio.get_profile()).email == "giorgio@example.com"
    assert (await giulia.get_profile()).email == "giulia@example.com"


async def test_invalid_key(session) -> None:
    client = TududiClient(session, TUDUDI_URL, "tt_invalid")
    with pytest.raises(TududiAuthError):
        await client.get_profile()


async def test_seeded_data_shape(giorgio: TududiClient) -> None:
    tasks = await giorgio.get_tasks()
    assert all(t.is_open for t in tasks)

    all_tasks = await giorgio.get_tasks(include_done=True)
    seeded = {
        "Electricity invoice",
        "Water invoice",
        "Internet invoice",
        "Insurance invoice",
        "Daycare invoice",
        "Old paid invoice",
    }
    invoices = [t for t in all_tasks if t.name in seeded]
    assert {t.name for t in invoices} == seeded
    assert all("invoice" in t.tags and t.project_name == "Household bills" for t in invoices)
    assert any(t.is_done for t in all_tasks)

    projects = {p.name for p in await giorgio.get_projects()}
    assert {"Household bills", "Devices"} <= projects
    assert "invoice" in {t.name for t in await giorgio.get_tags()}
    assert {"Bills info", "Hallway motion sensor"} <= {n.title for n in await giorgio.get_notes()}

    people = await giorgio.get_people()
    assert {"Giorgio", "Giulia"} <= {p.name for p in people}


async def test_shared_project_visible_to_giulia(
    giorgio: TududiClient, giulia: TududiClient
) -> None:
    people = await giorgio.get_people()
    giulia_uid = next(p.uid for p in people if p.name == "Giulia")

    tasks = await giulia.get_tasks()
    names = {t.name for t in tasks}
    assert {"Electricity invoice", "Internet invoice", "Book dentist"} <= names
    assert "Fix bike tyre" not in names  # Giorgio's private task
    internet = next(t for t in tasks if t.name == "Internet invoice")
    assert internet.assigned_to == giulia_uid

    notes = {n.title for n in await giulia.get_notes()}
    assert "Bills info" in notes
    assert "Hallway motion sensor" not in notes  # Devices project is not shared


async def test_task_lifecycle(giorgio: TududiClient) -> None:
    projects = {p.name: p for p in await giorgio.get_projects()}
    due = date.today() + timedelta(days=4)
    name = _name("lifecycle")

    created = await giorgio.create_task(
        name,
        due_date=due,
        tags=["invoice", "it-test"],
        note="Amount 10 EUR",
        priority=2,
        project_uid=projects["Household bills"].uid,
    )
    try:
        assert created.name == name
        assert created.due_date == due
        assert sorted(created.tags) == ["invoice", "it-test"]
        assert created.priority == 2
        assert created.project_uid == projects["Household bills"].uid
        assert created.status == TaskStatus.NOT_STARTED

        updated = await giorgio.update_task(
            created.uid, name=f"{name} edited", due_date=due + timedelta(days=1), tags=["it-test"]
        )
        assert updated.name == f"{name} edited"
        assert updated.due_date == due + timedelta(days=1)
        assert updated.tags == ["it-test"]
        assert updated.note == "Amount 10 EUR"

        fetched = await giorgio.get_task(created.uid)
        assert fetched.name == f"{name} edited"

        done = await giorgio.complete_task(created.uid)
        assert done.is_done
        assert done.completed_at is not None
        assert created.uid not in {t.uid for t in await giorgio.get_tasks()}
        assert created.uid in {t.uid for t in await giorgio.get_tasks(include_done=True)}

        reopened = await giorgio.reopen_task(created.uid)
        assert reopened.is_open
    finally:
        await giorgio.delete_task(created.uid)

    with pytest.raises(TududiNotFoundError):
        await giorgio.get_task(created.uid)


async def test_assign_task_to_person(giorgio: TududiClient, giulia: TududiClient) -> None:
    people = {p.name: p for p in await giorgio.get_people()}
    task = await giorgio.create_task(_name("assigned"), assigned_to=people["Giulia"].uid)
    try:
        assert task.assigned_to == people["Giulia"].uid
        assert task.uid in {t.uid for t in await giulia.get_tasks()}
        cleared = await giorgio.update_task(task.uid, assigned_to=None)
        assert cleared.assigned_to is None
    finally:
        await giorgio.delete_task(task.uid)


async def test_note_lifecycle(giorgio: TududiClient) -> None:
    projects = {p.name: p for p in await giorgio.get_projects()}
    title = _name("note")
    note = await giorgio.create_note(
        title, content="Battery: AA", project_uid=projects["Devices"].uid, tags=["it-test"]
    )
    try:
        assert note.title == title
        assert note.content == "Battery: AA"
        assert note.project_uid == projects["Devices"].uid
        updated = await giorgio.update_note(note.uid, content="Battery: AAA")
        assert updated.content == "Battery: AAA"
    finally:
        await giorgio.delete_note(note.uid)
    assert note.uid not in {n.uid for n in await giorgio.get_notes()}


async def test_invoice_data_comment(giorgio: TududiClient, giulia: TududiClient) -> None:
    """Invoice data survives a round trip through tududi comments."""
    from decimal import Decimal

    from custom_components.tududi.invoices import (
        InvoiceData,
        data_comments,
        format_comment,
    )

    # tududi does not delete comments with their task and reuses task ids, so
    # use one permanent task instead of creating and deleting one per run.
    name = "[it] invoice comment test (keep)"
    task = next((t for t in await giorgio.get_tasks() if t.name == name), None)
    if task is None:
        task = await giorgio.create_task(name, tags=["it-test"])

    data = InvoiceData(amount=Decimal("52.10"), currency="EUR", reference="RF18 1234")
    created = await giorgio.create_comment(task.uid, format_comment(data))
    try:
        assert created.is_own
        found = data_comments(await giorgio.get_comments(task.uid))
        assert [d for _, d in found] == [data]
    finally:
        await giorgio.delete_comment(created.uid)
    # Deleted comments are still listed by tududi but must be ignored.
    assert data_comments(await giorgio.get_comments(task.uid)) == []
