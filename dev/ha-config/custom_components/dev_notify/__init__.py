"""Dev-only notify targets that record messages for tests.

configuration.yaml:
    dev_notify:
      targets: [test_giorgio, test_giulia]

Each target registers notify.<name>. Every call is appended as one JSON line
to /config/notify/<name>.jsonl and shown as a persistent notification.
"""

from __future__ import annotations

import json
from pathlib import Path

import probatio as vol
from homeassistant.components import persistent_notification
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.util import dt as dt_util

DOMAIN = "dev_notify"

CONFIG_SCHEMA = vol.Schema(
    {DOMAIN: vol.Schema({vol.Required("targets"): vol.All(cv.ensure_list, [cv.slug])})},
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the recording notify services."""
    log_dir = Path(hass.config.path("notify"))
    await hass.async_add_executor_job(lambda: log_dir.mkdir(exist_ok=True))

    for target in config[DOMAIN]["targets"]:

        async def handle(call: ServiceCall, target: str = target) -> None:
            record = {"time": dt_util.now().isoformat(), "target": target, **call.data}
            line = json.dumps(record, default=str) + "\n"

            def write() -> None:
                with (log_dir / f"{target}.jsonl").open("a") as f:
                    f.write(line)

            await hass.async_add_executor_job(write)
            persistent_notification.async_create(
                hass,
                f"{call.data.get('message', '')}",
                title=f"[{target}] {call.data.get('title', '')}",
            )

        hass.services.async_register("notify", target, handle)
    return True
