"""Tests for invoice data (tududi comments) and invoice links (HA storage)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.tududi.const import CONF_DEFAULT_NOTIFY, DEFAULT_OPTIONS, DOMAIN
from custom_components.tududi.invoices import (
    FOOTER,
    HEADER,
    INVOICE_LINKS,
    InvoiceData,
    data_comments,
    format_comment,
    parse_amount,
    parse_comment,
)
from custom_components.tududi.models import Comment
from custom_components.tududi.websocket import snapshot

from .conftest import setup_entry

WATER = "ex1a89dc127fsiz"  # invoice, due 2026-10-15
ELECTRICITY = "11hxs1zevxa8284"  # invoice, due 2026-10-14
BIKE = "aqzsih96v509h3f"  # not an invoice


def comment(
    uid: str,
    data: InvoiceData,
    *,
    own: bool = True,
    minutes: int = 0,
    email: str = "giorgio@example.com",
) -> Comment:
    return Comment(
        uid=uid,
        body=format_comment(data),
        is_own=own,
        author_email=email,
        created_at=datetime(2026, 10, 1, tzinfo=UTC) + timedelta(minutes=minutes),
    )


# --------------------------------------------------------------------------- format


def test_format_and_parse_roundtrip() -> None:
    data = InvoiceData(amount=Decimal("52.1"), currency="EUR", reference='RF18 "1234"')
    body = format_comment(data)
    assert body.startswith(HEADER)
    assert body.endswith(FOOTER)
    assert "```yaml\nhass_tududi: 1\ntype: invoice\namount: 52.10\ncurrency: EUR\n" in body
    parsed = parse_comment(body)
    assert parsed == InvoiceData(amount=Decimal("52.10"), currency="EUR", reference='RF18 "1234"')


def test_parse_is_tolerant() -> None:
    assert parse_comment("Just a normal comment") is None
    assert parse_comment(f"{HEADER}\n```yaml\nhass_tududi: 1\namount: [broken\n```") is None
    assert parse_comment("```yaml\nhass_tududi: 1\ntype: other\n```") is None
    # Hand-edited: comma decimal, lowercase currency, unknown key, no fence.
    parsed = parse_comment(
        f"{HEADER}\nhass_tududi: 1\namount: 12,5\ncurrency: eur\nnote_to_self: hi\n{FOOTER}"
    )
    assert parsed == InvoiceData(
        amount=Decimal("12.5"), currency="EUR", extra={"note_to_self": "hi"}
    )
    # Invalid amount does not hide the rest.
    parsed = parse_comment("```yaml\nhass_tududi: 1\namount: lots\nreference: X\n```")
    assert parsed == InvoiceData(amount=None, reference="X")


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("52.10", "52.10"),
        ("1 234,50", "1234.50"),
        (7, "7"),
        ("", None),
        ("abc", None),
        (None, None),
    ],
)
def test_parse_amount(value: Any, expected: str | None) -> None:
    parsed = parse_amount(value)
    assert (str(parsed) if parsed is not None else None) == expected


def test_data_comments_newest_first() -> None:
    old = comment("a", InvoiceData(amount=Decimal(1)), minutes=0)
    new = comment("b", InvoiceData(amount=Decimal(2)), minutes=5)
    other = Comment(uid="c", body="hello")
    assert [c.uid for c, _ in data_comments([old, other, new])] == ["b", "a"]


# --------------------------------------------------------------------------- coordinator


@pytest.fixture(autouse=True)
async def frozen(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    await hass.config.async_set_time_zone("Europe/Helsinki")
    hass.config.currency = "EUR"
    freezer.move_to("2026-10-15T05:00:00+00:00")


def coordinator(entry: MockConfigEntry):
    return entry.runtime_data.coordinator


async def test_refresh_fetches_comments_of_invoices_only(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    water = comment("w1", InvoiceData(amount=Decimal("31.00"), currency="EUR", reference="R1"))
    mock_client.get_comments.side_effect = lambda uid: [water] if uid == WATER else []
    await setup_entry(hass, config_entry)

    fetched = {call.args[0] for call in mock_client.get_comments.await_args_list}
    assert WATER in fetched and ELECTRICITY in fetched
    assert BIKE not in fetched
    assert coordinator(config_entry).data.invoices == {
        WATER: InvoiceData(amount=Decimal("31.00"), currency="EUR", reference="R1")
    }


async def test_comments_are_cached(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, config_entry)
    calls = mock_client.get_comments.await_count

    await coordinator(config_entry).async_refresh()
    assert mock_client.get_comments.await_count == calls  # cached

    freezer.tick(timedelta(minutes=11))
    coordinator(config_entry)._invoice_cache = {
        uid: (fetched - 700, found)
        for uid, (fetched, found) in coordinator(config_entry)._invoice_cache.items()
    }
    await coordinator(config_entry).async_refresh()
    assert mock_client.get_comments.await_count > calls


async def test_set_invoice_replaces_own_comment(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.get_comments.side_effect = None
    mock_client.get_comments.return_value = [
        comment("old", InvoiceData(amount=Decimal(1), extra={"iban": "FI00"})),
        Comment(uid="human", body="Paid already?"),
    ]
    result = await coordinator(config_entry).async_set_invoice(
        WATER, InvoiceData(amount=Decimal("31.5"), reference="R2")
    )
    assert result == InvoiceData(
        amount=Decimal("31.5"), currency="EUR", reference="R2", extra={"iban": "FI00"}
    )
    body = mock_client.create_comment.await_args.args[1]
    assert parse_comment(body) == result
    mock_client.delete_comment.assert_awaited_once_with("old")  # human comment untouched
    assert coordinator(config_entry).data.invoices[WATER] == result


async def test_set_invoice_keeps_foreign_comment_it_cannot_delete(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.get_comments.side_effect = None
    mock_client.get_comments.return_value = [
        comment("theirs", InvoiceData(amount=Decimal(1)), own=False, email="other@example.com")
    ]
    await coordinator(config_entry).async_set_invoice(WATER, InvoiceData(amount=Decimal(2)))
    mock_client.delete_comment.assert_not_awaited()
    assert coordinator(config_entry).data.invoices[WATER].amount == Decimal(2)


async def test_set_invoice_deletes_foreign_comment_via_authors_account(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    mock_client.get_comments.side_effect = None
    # Written by the account itself, but reported as not own (e.g. via another entry).
    mock_client.get_comments.return_value = [
        comment("theirs", InvoiceData(amount=Decimal(1)), own=False, email="GIORGIO@example.com")
    ]
    await coordinator(config_entry).async_set_invoice(WATER, InvoiceData(amount=Decimal(2)))
    mock_client.delete_comment.assert_awaited_once_with("theirs")


async def test_clearing_invoice_removes_data(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    mock_client.get_comments.side_effect = lambda uid: (
        [comment("w1", InvoiceData(amount=Decimal(3)))] if uid == WATER else []
    )
    await setup_entry(hass, config_entry)
    assert WATER in coordinator(config_entry).data.invoices
    assert await coordinator(config_entry).async_set_invoice(WATER, InvoiceData()) is None
    mock_client.create_comment.assert_not_awaited()
    mock_client.delete_comment.assert_awaited_once_with("w1")
    assert WATER not in coordinator(config_entry).data.invoices


async def test_create_invoice_links_previous_by_name(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    task = await coordinator(config_entry).async_create_invoice(
        "water INVOICE",
        InvoiceData(amount=Decimal("33.00")),
        due_date=date(2026, 11, 15),
        project_uid="jeqrjkh14aj9w8q",
    )
    kwargs = mock_client.create_task.await_args.kwargs
    assert kwargs["tags"] == ["invoice"]
    assert kwargs["due_date"] == date(2026, 11, 15)
    links = hass.data[INVOICE_LINKS]
    assert links.previous[task.uid] == WATER
    assert links.next_of(WATER) == task.uid
    assert mock_client.create_comment.await_count == 1

    snap = snapshot(hass, config_entry)
    water = next(t for t in snap["tasks"] if t["uid"] == WATER)
    assert water["invoice"]["next_uid"] == task.uid
    bike = next(t for t in snap["tasks"] if t["uid"] == BIKE)
    assert bike["invoice"] is None
    assert snap["currency"] == "EUR"


async def test_create_invoice_without_link(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    task = await coordinator(config_entry).async_create_invoice(
        "Water invoice", InvoiceData(), auto_link=False, due_date=date(2026, 11, 15)
    )
    assert task.uid not in hass.data[INVOICE_LINKS].previous
    mock_client.create_comment.assert_not_awaited()


async def test_delete_keeps_chain_connected(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    links = hass.data[INVOICE_LINKS]
    links.set_previous("c", "b")
    links.set_previous("b", "a")
    await coordinator(config_entry).async_delete_tasks(["b"])
    assert links.previous == {"c": "a"}


async def test_links_persist(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
) -> None:
    await setup_entry(hass, config_entry)
    hass.data[INVOICE_LINKS].set_previous("new", WATER)
    freezer.tick(timedelta(seconds=2))
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=2))
    await hass.async_block_till_done()
    assert hass_storage["tududi.invoices"]["data"] == {"previous": {"new": WATER}}


# --------------------------------------------------------------------------- actions & reminders


async def call(hass: HomeAssistant, service: str, **data: Any) -> dict[str, Any]:
    result = await hass.services.async_call(
        DOMAIN, service, data, blocking=True, return_response=True
    )
    assert result is not None
    return result


async def test_create_invoice_action(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(
        hass,
        "create_invoice",
        config_entry_id=config_entry.entry_id,
        name="Water invoice",
        due_date="2026-11-15",
        amount="33,40",
        reference="R3",
        project="Household bills",
        assigned_to="Giulia",
    )
    assert result["previous_uid"] == WATER
    assert result["task"]["invoice"] == {"amount": "33.40", "currency": "EUR", "reference": "R3"}
    kwargs = mock_client.create_task.await_args.kwargs
    assert kwargs["project_uid"] == "jeqrjkh14aj9w8q"
    assert kwargs["assigned_to"] == "mg57u3pu2i40r15"


async def test_update_invoice_action(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    result = await call(
        hass,
        "update_invoice",
        config_entry_id=config_entry.entry_id,
        uid=WATER,
        amount="10",
        currency="usd",
    )
    assert result["invoice"] == {"amount": "10.00", "currency": "USD", "reference": None}

    found = await call(hass, "find_tasks", config_entry_id=config_entry.entry_id, tag="invoice")
    water = next(t for t in found["tasks"] if t["uid"] == WATER)
    assert water["invoice"]["amount"] == "10.00"


async def test_invalid_amount_rejected(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    await setup_entry(hass, config_entry)
    with pytest.raises(Exception, match="Invalid amount"):
        await call(
            hass,
            "create_invoice",
            config_entry_id=config_entry.entry_id,
            name="x",
            due_date="2026-11-15",
            amount="lots",
        )


async def test_reminder_includes_amount_and_reference(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    notify: list[ServiceCall] = async_mock_service(hass, "notify", "phone")
    mock_client.get_comments.side_effect = lambda uid: (
        [comment("w1", InvoiceData(amount=Decimal("31"), currency="EUR", reference="RF18"))]
        if uid == WATER
        else []
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title=config_entry.title,
        unique_id=config_entry.unique_id,
        data=dict(config_entry.data),
        options={**DEFAULT_OPTIONS, CONF_DEFAULT_NOTIFY: "notify.phone"},
    )
    await setup_entry(hass, entry)
    await call(hass, "run_reminders")
    water = next(c for c in notify if c.data["title"] == "Water invoice")
    assert water.data["message"] == (
        "Due today (2026-10-15) · 31.00 EUR\nReference: RF18\nAmount 31.00 EUR"
    )


def test_deleted_comments_are_ignored() -> None:
    deleted = comment("gone", InvoiceData(amount=Decimal(1)))
    deleted.deleted = True
    assert data_comments([deleted]) == []
    assert Comment.from_api({"uid": "x", "body": "", "deleted_at": "2026-10-15T18:00:00Z"}).deleted


async def test_deleting_invoice_removes_its_data_comments_first(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    mock_client.get_comments.side_effect = lambda uid: (
        [comment("w1", InvoiceData(amount=Decimal(3)))] if uid == WATER else []
    )
    await setup_entry(hass, config_entry)
    order: list[str] = []
    mock_client.delete_comment.side_effect = lambda uid: order.append(f"comment:{uid}")
    mock_client.delete_task.side_effect = lambda uid: order.append(f"task:{uid}")
    await coordinator(config_entry).async_delete_tasks([WATER, BIKE])
    assert order == ["comment:w1", f"task:{WATER}", f"task:{BIKE}"]
