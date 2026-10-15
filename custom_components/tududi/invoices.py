"""Invoice data for tududi tasks.

Invoice details (amount, currency, reference) belong to the task, so they are
stored in tududi as a task comment with a clearly marked YAML block that the
integration reads and writes:

    🏠 Home Assistant data (do not edit)

    ```yaml
    hass_tududi: 1
    type: invoice
    amount: 52.10
    currency: EUR
    reference: "RF18 1234 5678"
    ```

    (Home Assistant data ends)

Links between invoices (previous invoice of the same series) are integration
data and stay in Home Assistant storage, keyed by task uid.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Any

import yaml
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN
from .models import Comment

_LOGGER = logging.getLogger(__name__)

FORMAT_VERSION = 1
HEADER = "🏠 Home Assistant data (do not edit)"
FOOTER = "(Home Assistant data ends)"
MARKER_KEY = "hass_tududi"
INVOICE_TYPE = "invoice"
KNOWN_KEYS = (MARKER_KEY, "type", "amount", "currency", "reference")

INVOICE_LINKS: HassKey[InvoiceLinks] = HassKey(f"{DOMAIN}_invoice_links")
LINKS_STORAGE_KEY = f"{DOMAIN}.invoices"
LINKS_STORAGE_VERSION = 1

_FENCE = re.compile(r"```(?:ya?ml)?\s*\n(.*?)```", re.DOTALL)


@dataclass(slots=True)
class InvoiceData:
    """Invoice details stored with a tududi task."""

    amount: Decimal | None = None
    currency: str | None = None
    reference: str | None = None
    extra: dict[str, str] = field(default_factory=dict)

    @property
    def is_empty(self) -> bool:
        """Return True when there is nothing worth storing."""
        return self.amount is None and not self.currency and not self.reference

    def as_dict(self) -> dict[str, Any]:
        """Serialize for websocket and service responses."""
        return {
            "amount": format_amount(self.amount),
            "currency": self.currency,
            "reference": self.reference,
        }


def parse_amount(value: Any) -> Decimal | None:
    """Parse an amount like '52.10', '52,10' or 52.1. Returns None if invalid."""
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    text = str(value).strip().replace("\u00a0", "").replace(" ", "")
    if "," in text and "." not in text:
        text = text.replace(",", ".")
    try:
        amount = Decimal(text)
    except InvalidOperation:
        return None
    return amount if amount.is_finite() else None


def format_amount(amount: Decimal | None) -> str | None:
    """Format an amount with two decimals."""
    return None if amount is None else f"{amount:.2f}"


def format_comment(data: InvoiceData) -> str:
    """Render invoice data as a tududi comment body."""
    lines = [f"{MARKER_KEY}: {FORMAT_VERSION}", f"type: {INVOICE_TYPE}"]
    if data.amount is not None:
        lines.append(f"amount: {format_amount(data.amount)}")
    if data.currency:
        lines.append(f"currency: {data.currency}")
    if data.reference:
        lines.append(f"reference: {json.dumps(data.reference, ensure_ascii=False)}")
    for key, value in data.extra.items():
        lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
    block = "\n".join(lines)
    return f"{HEADER}\n\n```yaml\n{block}\n```\n\n{FOOTER}"


def parse_comment(body: str) -> InvoiceData | None:
    """Parse a comment body. Returns None unless it is a Home Assistant data block."""
    if MARKER_KEY not in body:
        return None
    match = _FENCE.search(body)
    text = match.group(1) if match else body.split(HEADER, 1)[-1].split(FOOTER, 1)[0]
    try:
        # BaseLoader keeps every scalar a string, so amounts stay exact.
        raw = yaml.load(text, Loader=yaml.BaseLoader)
    except yaml.YAMLError:
        return None
    if not isinstance(raw, dict) or MARKER_KEY not in raw:
        return None
    if raw.get("type", INVOICE_TYPE) != INVOICE_TYPE:
        return None
    currency = str(raw.get("currency") or "").strip().upper() or None
    reference = str(raw.get("reference") or "").strip() or None
    return InvoiceData(
        amount=parse_amount(raw.get("amount")),
        currency=currency,
        reference=reference,
        extra={
            str(k): str(v) for k, v in raw.items() if k not in KNOWN_KEYS and isinstance(v, str)
        },
    )


def data_comments(comments: list[Comment]) -> list[tuple[Comment, InvoiceData]]:
    """Return Home Assistant data comments, newest first."""
    found = [
        (c, d) for c in comments if not c.deleted and (d := parse_comment(c.body)) is not None
    ]
    found.sort(
        key=lambda pair: pair[0].created_at.timestamp() if pair[0].created_at else 0, reverse=True
    )
    return found


class InvoiceLinks:
    """Previous-invoice links (task uid -> previous task uid), stored in Home Assistant."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self._store: Store[dict[str, Any]] = Store(hass, LINKS_STORAGE_VERSION, LINKS_STORAGE_KEY)
        self.previous: dict[str, str] = {}

    async def async_load(self) -> None:
        """Load links from storage."""
        stored = await self._store.async_load() or {}
        self.previous = dict(stored.get("previous", {}))

    @callback
    def set_previous(self, uid: str, previous_uid: str | None) -> None:
        """Link a task to its previous invoice (or remove the link)."""
        if previous_uid and previous_uid != uid:
            self.previous[uid] = previous_uid
        else:
            self.previous.pop(uid, None)
        self._store.async_delay_save(lambda: {"previous": self.previous}, 1)

    def next_of(self, uid: str) -> str | None:
        """Return the task that follows `uid`, if any."""
        return next((t for t, prev in self.previous.items() if prev == uid), None)

    @callback
    def remove(self, uid: str) -> None:
        """Forget a deleted task, keeping the chain connected around it."""
        before = self.previous.pop(uid, None)
        for task_uid, prev in list(self.previous.items()):
            if prev == uid:
                if before:
                    self.previous[task_uid] = before
                else:
                    del self.previous[task_uid]
        self._store.async_delay_save(lambda: {"previous": self.previous}, 1)
