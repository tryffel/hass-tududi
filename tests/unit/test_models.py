"""Tests for model parsing using captured tududi 1.9.1 responses."""

from __future__ import annotations

from datetime import date

from custom_components.tududi.models import (
    Note,
    Person,
    Profile,
    Project,
    Tag,
    Task,
    TaskStatus,
    parse_date,
)

from .conftest import load_fixture


def test_parse_date_formats() -> None:
    assert parse_date("2026-10-20") == date(2026, 10, 20)
    assert parse_date("2026-10-20T12:30:00.000Z") == date(2026, 10, 20)
    assert parse_date(None) is None
    assert parse_date("garbage") is None


def test_tasks_from_fixture() -> None:
    tasks = [Task.from_api(t) for t in load_fixture("tasks")["tasks"]]
    by_name = {t.name: t for t in tasks}

    electricity = by_name["Electricity invoice"]
    assert electricity.tags == ["invoice"]
    assert electricity.project_name == "Household bills"
    assert electricity.project_uid
    assert isinstance(electricity.due_date, date)
    assert electricity.note and "52.10" in electricity.note
    assert electricity.is_open

    assert by_name["Internet invoice"].assigned_to is not None

    paid = by_name["Old paid invoice"]
    assert paid.status == TaskStatus.DONE
    assert paid.is_done
    assert not paid.is_open

    bike = by_name["Fix bike tyre"]
    assert bike.due_date is not None
    assert bike.tags == []
    assert bike.project_uid is None


def test_other_models_from_fixtures() -> None:
    profile = Profile.from_api(load_fixture("profile"))
    assert profile.email == "giorgio@example.com"
    assert profile.display_name == "Giorgio"

    people = [Person.from_api(p) for p in load_fixture("people")["people"]]
    assert {p.name for p in people} >= {"Giorgio", "Giulia"}
    assert any(p.is_self for p in people)

    projects = [Project.from_api(p) for p in load_fixture("projects")["projects"]]
    assert {p.name for p in projects} == {"Household bills", "Devices"}

    tags = [Tag.from_api(t) for t in load_fixture("tags")]
    assert "invoice" in {t.name for t in tags}

    notes = [Note.from_api(n) for n in load_fixture("notes")]
    bills = next(n for n in notes if n.title == "Bills info")
    assert bills.project_name == "Household bills"
    assert bills.project_uid


def test_profile_display_name_falls_back_to_email() -> None:
    assert Profile(uid="x", email="a@b.c").display_name == "a@b.c"
