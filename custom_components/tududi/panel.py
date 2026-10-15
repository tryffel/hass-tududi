"""Sidebar panel registration."""

from __future__ import annotations

import hashlib
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

PANEL_URL_PATH = "tududi"
PANEL_TITLE = "Tududi"
PANEL_ICON = "mdi:checkbox-marked-circle-outline"
WEBCOMPONENT = "tududi-panel"
STATIC_URL = "/tududi_static"
FRONTEND_DIR = Path(__file__).parent / "frontend"
BUNDLE = "tududi-panel.js"


def _bundle_version() -> str:
    path = FRONTEND_DIR / BUNDLE
    if not path.exists():
        return "missing"
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


async def async_register_panel(hass: HomeAssistant) -> None:
    """Serve the panel bundle and add the sidebar entry."""
    version = await hass.async_add_executor_job(_bundle_version)
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
    )
    if PANEL_URL_PATH in hass.data.get(frontend.DATA_PANELS, {}):
        return
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=WEBCOMPONENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/{BUNDLE}?v={version}",
        require_admin=False,
        config={},
    )
