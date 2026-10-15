"""Config flow for the Tududi integration."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

import probatio as vol
from homeassistant.config_entries import (
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlowWithReload,
)
from homeassistant.const import CONF_API_KEY, CONF_URL
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
    TimeSelector,
)

from . import TududiConfigEntry, create_client
from .api import TududiAuthError, TududiError, normalize_base_url
from .const import (
    CONF_DEFAULT_NOTIFY,
    CONF_HA_USER,
    CONF_PERSON_NOTIFY,
    CONF_REMINDER_DAYS_BEFORE,
    CONF_REMINDER_INCLUDE_OVERDUE,
    CONF_REMINDER_TAG,
    CONF_REMINDER_TIME,
    CONF_REMINDERS_ENABLED,
    CONF_UPDATE_INTERVAL,
    CONF_VERIFY_SSL,
    DEFAULT_OPTIONS,
    DOMAIN,
    MIN_UPDATE_INTERVAL,
)
from .models import Person, Profile

_LOGGER = logging.getLogger(__name__)

# Notify services that are not phones/people.
EXCLUDED_NOTIFY_SERVICES = {"persistent_notification", "send_message"}

URL_SELECTOR = TextSelector(TextSelectorConfig(type=TextSelectorType.URL))
KEY_SELECTOR = TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD))


class TududiConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the setup of a tududi account."""

    VERSION = 1

    async def _validate(
        self, url: str, api_key: str, verify_ssl: bool
    ) -> tuple[Profile | None, dict[str, str]]:
        client = create_client(self.hass, url, api_key, verify_ssl)
        try:
            return await client.get_profile(), {}
        except TududiAuthError:
            return None, {"base": "invalid_auth"}
        except TududiError as err:
            _LOGGER.debug("Cannot connect to tududi at %s: %s", url, err)
            return None, {"base": "cannot_connect"}
        except Exception:
            _LOGGER.exception("Unexpected error validating tududi connection")
            return None, {"base": "unknown"}

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask for the tududi URL and API key."""
        errors: dict[str, str] = {}
        if user_input is not None:
            url = normalize_base_url(user_input[CONF_URL])
            profile, errors = await self._validate(
                url, user_input[CONF_API_KEY], user_input[CONF_VERIFY_SSL]
            )
            if profile:
                await self.async_set_unique_id(profile.uid)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=profile.display_name,
                    data={
                        CONF_URL: url,
                        CONF_API_KEY: user_input[CONF_API_KEY],
                        CONF_VERIFY_SSL: user_input[CONF_VERIFY_SSL],
                    },
                    options=dict(DEFAULT_OPTIONS),
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_URL): URL_SELECTOR,
                vol.Required(CONF_API_KEY): KEY_SELECTOR,
                vol.Required(CONF_VERIFY_SSL, default=True): BooleanSelector(),
            }
        )
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(schema, user_input),
            errors=errors,
        )

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> ConfigFlowResult:
        """Start reauthentication when the API key stops working."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for a new API key."""
        entry = self._get_reauth_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            profile, errors = await self._validate(
                entry.data[CONF_URL],
                user_input[CONF_API_KEY],
                entry.data.get(CONF_VERIFY_SSL, True),
            )
            if profile:
                await self.async_set_unique_id(profile.uid)
                self._abort_if_unique_id_mismatch(reason="wrong_account")
                return self.async_update_reload_and_abort(
                    entry, data_updates={CONF_API_KEY: user_input[CONF_API_KEY]}
                )

        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema({vol.Required(CONF_API_KEY): KEY_SELECTOR}),
            description_placeholders={"name": entry.title, "url": entry.data[CONF_URL]},
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Change the URL, API key or SSL setting of an existing entry."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            url = normalize_base_url(user_input[CONF_URL])
            profile, errors = await self._validate(
                url, user_input[CONF_API_KEY], user_input[CONF_VERIFY_SSL]
            )
            if profile:
                await self.async_set_unique_id(profile.uid)
                self._abort_if_unique_id_mismatch(reason="wrong_account")
                return self.async_update_reload_and_abort(
                    entry,
                    data_updates={
                        CONF_URL: url,
                        CONF_API_KEY: user_input[CONF_API_KEY],
                        CONF_VERIFY_SSL: user_input[CONF_VERIFY_SSL],
                    },
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_URL): URL_SELECTOR,
                vol.Required(CONF_API_KEY): KEY_SELECTOR,
                vol.Required(CONF_VERIFY_SSL): BooleanSelector(),
            }
        )
        return self.async_show_form(
            step_id="reconfigure",
            data_schema=self.add_suggested_values_to_schema(schema, user_input or dict(entry.data)),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: TududiConfigEntry) -> TududiOptionsFlow:
        """Return the options flow."""
        return TududiOptionsFlow()


class TududiOptionsFlow(OptionsFlowWithReload):
    """Options: linked HA user, polling, notify targets and reminders."""

    def __init__(self) -> None:
        """Initialize the options flow."""
        self._options: dict[str, Any] = {}
        self._people: list[Person] = []

    def _notify_options(self) -> list[str]:
        services = self.hass.services.async_services_for_domain("notify")
        return sorted(f"notify.{name}" for name in services if name not in EXCLUDED_NOTIFY_SERVICES)

    def _notify_selector(self) -> SelectSelector:
        return SelectSelector(
            SelectSelectorConfig(
                options=self._notify_options(),
                custom_value=True,
                mode=SelectSelectorMode.DROPDOWN,
            )
        )

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """General and reminder options."""
        current = {**DEFAULT_OPTIONS, **self.config_entry.options}
        if user_input is not None:
            self._options = {**current, **user_input}
            for key in (CONF_HA_USER, CONF_DEFAULT_NOTIFY):
                if key not in user_input:
                    self._options[key] = None
            self._options[CONF_UPDATE_INTERVAL] = int(self._options[CONF_UPDATE_INTERVAL])
            self._options[CONF_REMINDER_DAYS_BEFORE] = int(self._options[CONF_REMINDER_DAYS_BEFORE])
            try:
                self._people = await self.config_entry.runtime_data.client.get_people()
            except (TududiError, AttributeError) as err:
                _LOGGER.debug("Could not load tududi people: %s", err)
                self._people = []
            if self._people:
                return await self.async_step_notify()
            return self.async_create_entry(data=self._options)

        users = [
            user
            for user in await self.hass.auth.async_get_users()
            if user.is_active and not user.system_generated
        ]
        user_selector = SelectSelector(
            SelectSelectorConfig(
                options=[SelectOptionDict(value=u.id, label=u.name or u.id) for u in users],
                mode=SelectSelectorMode.DROPDOWN,
            )
        )
        schema = vol.Schema(
            {
                vol.Optional(CONF_HA_USER): user_selector,
                vol.Required(CONF_UPDATE_INTERVAL): NumberSelector(
                    NumberSelectorConfig(
                        min=MIN_UPDATE_INTERVAL,
                        max=3600,
                        step=1,
                        unit_of_measurement="s",
                        mode=NumberSelectorMode.BOX,
                    )
                ),
                vol.Optional(CONF_DEFAULT_NOTIFY): self._notify_selector(),
                vol.Required(CONF_REMINDERS_ENABLED): BooleanSelector(),
                vol.Required(CONF_REMINDER_TAG): TextSelector(),
                vol.Required(CONF_REMINDER_DAYS_BEFORE): NumberSelector(
                    NumberSelectorConfig(
                        min=0,
                        max=60,
                        step=1,
                        unit_of_measurement="d",
                        mode=NumberSelectorMode.BOX,
                    )
                ),
                vol.Required(CONF_REMINDER_TIME): TimeSelector(),
                vol.Required(CONF_REMINDER_INCLUDE_OVERDUE): BooleanSelector(),
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(schema, current),
        )

    async def async_step_notify(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Map tududi people (task assignees) to notify services."""
        labels = _person_labels(self._people)
        if user_input is not None:
            mapping = {
                person.uid: user_input[label]
                for label, person in labels.items()
                if user_input.get(label)
            }
            self._options[CONF_PERSON_NOTIFY] = mapping
            return self.async_create_entry(data=self._options)

        current: dict[str, str] = self._options.get(CONF_PERSON_NOTIFY) or {}
        selector = self._notify_selector()
        schema = vol.Schema(
            {
                vol.Optional(
                    label, description={"suggested_value": current.get(person.uid)}
                ): selector
                for label, person in labels.items()
            }
        )
        return self.async_show_form(step_id="notify", data_schema=schema)


def _person_labels(people: list[Person]) -> dict[str, Person]:
    """Return unique form field labels for people, keeping their order."""
    labels: dict[str, Person] = {}
    for person in people:
        label = person.name or person.uid
        if label in labels:
            label = f"{label} ({person.uid})"
        labels[label] = person
    return labels
