"""Constants for the Tududi integration."""

from __future__ import annotations

from typing import Any, Final

DOMAIN: Final = "tududi"

CONF_VERIFY_SSL: Final = "verify_ssl"

# Options
CONF_HA_USER: Final = "ha_user"
CONF_UPDATE_INTERVAL: Final = "update_interval"
CONF_DEFAULT_NOTIFY: Final = "default_notify"
CONF_PERSON_NOTIFY: Final = "person_notify"
CONF_REMINDERS_ENABLED: Final = "reminders_enabled"
CONF_REMINDER_TAG: Final = "reminder_tag"
CONF_REMINDER_DAYS_BEFORE: Final = "reminder_days_before"
CONF_REMINDER_TIME: Final = "reminder_time"
CONF_REMINDER_INCLUDE_OVERDUE: Final = "reminder_include_overdue"

DEFAULT_UPDATE_INTERVAL: Final = 60
MIN_UPDATE_INTERVAL: Final = 15
DEFAULT_REMINDER_TAG: Final = "invoice"
DEFAULT_REMINDER_DAYS_BEFORE: Final = 7
DEFAULT_REMINDER_TIME: Final = "09:00:00"

DEFAULT_OPTIONS: Final[dict[str, Any]] = {
    CONF_HA_USER: None,
    CONF_UPDATE_INTERVAL: DEFAULT_UPDATE_INTERVAL,
    CONF_DEFAULT_NOTIFY: None,
    CONF_PERSON_NOTIFY: {},
    CONF_REMINDERS_ENABLED: True,
    CONF_REMINDER_TAG: DEFAULT_REMINDER_TAG,
    CONF_REMINDER_DAYS_BEFORE: DEFAULT_REMINDER_DAYS_BEFORE,
    CONF_REMINDER_TIME: DEFAULT_REMINDER_TIME,
    CONF_REMINDER_INCLUDE_OVERDUE: True,
}
