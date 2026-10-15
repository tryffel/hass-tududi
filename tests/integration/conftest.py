"""Fixtures for integration tests against the dev tududi container.

Run with `make test-integration` (needs `make dev-up` first). These tests run
without the Home Assistant pytest plugin so real network access is allowed.
"""

from __future__ import annotations

from pathlib import Path

import aiohttp
import pytest

from custom_components.tududi.api import TududiClient

SECRETS = Path(__file__).parents[2] / "dev" / ".secrets.env"
TUDUDI_URL = "http://localhost:3002"


def _secrets() -> dict[str, str]:
    if not SECRETS.exists():
        return {}
    return dict(
        line.split("=", 1)
        for line in SECRETS.read_text().splitlines()
        if "=" in line and not line.startswith("#")
    )


@pytest.fixture(scope="session")
def secrets() -> dict[str, str]:
    values = _secrets()
    if "TUDUDI_GIORGIO_KEY" not in values:
        pytest.skip("dev stack not bootstrapped; run `make dev-up`")
    return values


@pytest.fixture
async def session():
    async with aiohttp.ClientSession() as s:
        yield s


@pytest.fixture
def giorgio(session, secrets) -> TududiClient:
    return TududiClient(session, TUDUDI_URL, secrets["TUDUDI_GIORGIO_KEY"])


@pytest.fixture
def giulia(session, secrets) -> TududiClient:
    return TududiClient(session, TUDUDI_URL, secrets["TUDUDI_GIULIA_KEY"])
