# Tududi for Home Assistant

A Home Assistant integration for [tududi](https://github.com/chrisvel/tududi), the self-hosted task and notes app.

tududi stays the source of truth: tasks and notes are read and written through its REST API. Home Assistant adds a fast task panel, native to-do/calendar/sensor entities, actions for automations, and daily due date reminders on your phone (for example for invoices).

## Features

- **Tududi panel** in the sidebar: Today, Upcoming, Overdue, Inbox, Invoices, projects and tags, quick add, inline editing, project notes. Works on desktop and in the Home Assistant mobile app, light and dark themes.
- **Multiple users**: one config entry per tududi account (API key). Every Home Assistant user sees only the account(s) linked to them; sharing works through tududi's shared projects and task assignments.
- **Entities** per account: a to-do list, a calendar of due dates and sensors for overdue / due today / due this week.
- **Actions** for automations: create, update, complete and find tasks, add notes.
- **Reminders**: tasks with a tag (default `invoice`) get a daily notification during the days before their due date, sent to the assignee's phone, with **Mark paid** and **Snooze 1 day** buttons.

## Requirements

- Home Assistant 2026.10 or newer
- tududi 1.9 or newer, reachable from Home Assistant
- A tududi **personal API key** for each user (see below)
- For reminders: a notify service per person, e.g. the [Home Assistant Companion app](https://companion.home-assistant.io/) (`notify.mobile_app_<phone>`)

## Installation

### HACS (recommended)

1. In Home Assistant open **HACS → ⋮ → Custom repositories**.
2. Add `https://github.com/tryffel/hass-tududi` with type **Integration**.
3. Search for **Tududi** in HACS and download it.
4. Restart Home Assistant.

### Manual

1. Download the latest release (or clone this repository).
2. Copy `custom_components/tududi` into the `custom_components` folder of your Home Assistant configuration directory, so that you have `<config>/custom_components/tududi/manifest.json`.
3. Restart Home Assistant.

The panel's JavaScript bundle is included in `custom_components/tududi/frontend/`; no separate frontend installation is needed.

## Configuration

### 1. Create an API key in tududi

Log in to tududi as the user, open **Profile → API keys** and create a key. It starts with `tt_`. Repeat for every household member who should use the integration.

### 2. Add the integration

1. Go to **Settings → Devices & services → Add integration → Tududi**.
2. Enter:
   - **tududi URL**: the address of your tududi server, e.g. `https://tududi.example.com` or `http://192.168.1.10:3002`
   - **API key**: the key from step 1
   - **Verify SSL certificate**: turn off only for self-signed certificates
3. The entry is named after the tududi user. Add another entry for each user.

Home Assistant must be able to call `<tududi URL>/api/v1/…` directly. If tududi is behind a reverse proxy that requires an interactive login, allow API requests through (tududi still checks the API key) or use an internal URL.

### 3. Options

Open **Settings → Devices & services → Tududi → Configure** on each entry:

| Option | Description |
| --- | --- |
| Home Assistant user | The HA user this tududi account belongs to. That user sees the account in the Tududi panel. Admins also see accounts that are not linked to anyone. |
| Update interval | How often tududi is polled for changes (default 60 s). Changes made in Home Assistant are applied immediately. |
| Default notify service | Where reminders for tasks of this account go, e.g. `notify.mobile_app_my_phone`. |
| Enable due date reminders | Turn reminders on or off for this account. |
| Reminder tag | Tasks with this tag get reminders (default `invoice`). |
| Remind days before due date | Start reminding this many days before the due date (default 7). |
| Reminder time | Time of the daily reminder (default 09:00). |
| Remind about overdue tasks | Keep reminding after the due date has passed. |
| Notify targets per person | Second step: a notify service for each tududi person, used when a task is assigned to them. |

## Usage

### Tududi panel

Open **Tududi** in the sidebar.

- Pick a view on the left (or the chips at the top on a phone).
- Type in the **Add** field and press Enter. The new task gets sensible defaults for the current view: in *Invoices* it is tagged with the reminder tag, in a project it is added to that project, in *Today* it is due today.
- Click the circle to complete a task; click the task to edit it. Changes are saved as soon as you leave a field.
- Project notes are shown in project views and next to tasks of that project, and can be edited there.

### Entities

For an account named *Giorgio*:

| Entity | Description |
| --- | --- |
| `todo.tududi_giorgio` | Open tasks plus the 20 most recently completed; works with the built-in To-do lists dashboard and Assist. |
| `calendar.tududi_giorgio` | Open tasks as all-day events on their due date. |
| `sensor.tududi_giorgio_overdue` | Number of overdue tasks. |
| `sensor.tududi_giorgio_due_today` | Number of tasks due today. |
| `sensor.tududi_giorgio_due_this_week` | Number of tasks due today or within the next six days. |

The sensors have a `tasks` attribute (uid, name, due date, tags, project, assignee) for dashboards and templates. It is excluded from the recorder, so task contents are not written to the history database.

### Actions

All actions take `config_entry_id` (the tududi account). Projects and people can be given by name or uid.

| Action | Description |
| --- | --- |
| `tududi.create_task` | Create a task (name, due date, priority, status, project, tags, note, assignee). Returns the task. |
| `tududi.update_task` | Change fields of a task; `null` clears due date, project, assignee or note. Returns the task. |
| `tududi.complete_task` | Mark a task done. |
| `tududi.find_tasks` | Find open tasks by tag, text (name or note) and project; `include_done` also searches completed ones. Returns a list. |
| `tududi.add_note` | Create a note, optionally in a project. |
| `tududi.run_reminders` | Send today's reminders now (`force` resends). |

Example: create a task for an invoice received by email.

```yaml
action: tududi.create_task
data:
  config_entry_id: 01J0EXAMPLEENTRYID
  name: "Electricity invoice"
  due_date: "2026-11-01"
  project: "Household bills"
  tags: [invoice]
  note: "Amount 52.10 EUR, reference 1234 5678"
  assigned_to: "Giulia"
```

Example: create a task only once while a battery is low.

```yaml
- action: tududi.find_tasks
  data:
    config_entry_id: 01J0EXAMPLEENTRYID
    text: "ha:battery:sensor.hallway_motion_battery"
  response_variable: found
- if: "{{ found.tasks | count == 0 }}"
  then:
    - action: tududi.create_task
      data:
        config_entry_id: 01J0EXAMPLEENTRYID
        name: "Replace battery: Hallway motion sensor"
        tags: [battery]
        note: "ha:battery:sensor.hallway_motion_battery"
```

### Reminders

Every day at the reminder time, each open task with the reminder tag that is due within the configured number of days (or overdue) produces one notification:

- **Title**: task name. **Message**: e.g. "Due in 3 days (2026-10-18)" and the first line of the task note.
- **Mark paid** completes the task in tududi. **Snooze 1 day** skips the next day's reminder.
- A task assigned to someone goes to that person's notify service. Unassigned tasks go to the task owner's default notify service.
- Each task is reminded at most once per day, even when it is visible through several accounts (shared projects).
- If Home Assistant was not running at the reminder time, reminders are sent when it starts.

Every reminder also fires a `tududi_reminder` event (`config_entry_id`, `uid`, `name`, `due_date`, `days_left`, `target`) that you can use in your own automations.

## Privacy

- Task contents are kept in memory only and fetched from tududi on start.
- The recorder only stores entity states (counts, on/off); task lists and calendar event details are excluded.
- Reminder state (`.storage/tududi.reminders`) contains only task ids and dates.
- The tududi URL and API key are stored in Home Assistant's config entry storage like for any other integration, and are included in Home Assistant backups.
- API keys never reach the browser; the panel talks to Home Assistant over its websocket API.

## Troubleshooting

- **"Cannot reach the tududi API"** when adding the integration: check the URL from the Home Assistant host (e.g. `curl <url>/api/v1/health`) and make sure no login page is in front of `/api/v1`.
- **"The API key is invalid"**: the key was revoked or mistyped; create a new key in tududi. When a key stops working later, Home Assistant asks to re-authenticate.
- **Panel shows "No tududi account"**: link your Home Assistant user to an account in the integration options.
- **Debug logging**:

  ```yaml
  logger:
    logs:
      custom_components.tududi: debug
  ```

## Development

The repository contains a complete local environment with tududi and Home Assistant in Docker, seeded with two users (Giorgio and Giulia), shared projects, invoices and recording notify targets.

Requirements: Docker, [uv](https://docs.astral.sh/uv/), Node.js 22+.

```sh
uv sync                 # Python dev dependencies
make dev-up             # start tududi (localhost:3002) and Home Assistant (localhost:8123)
make dev-reset          # wipe and reseed everything
make build-frontend     # build the panel into custom_components/tududi/frontend/
make dev-restart-ha     # pick up Python changes

make lint               # ruff + mypy
make test               # Python unit tests
make test-frontend      # Vitest
make test-integration   # API contract tests against the tududi container
make test-e2e           # Playwright tests against the dev stack
```

Dev logins: `giorgio` / `giulia`, password `devpassword123` (tududi: `giorgio@example.com`, `giulia@example.com`).

See [SPEC.md](SPEC.md) for the behaviour, [PLAN.md](PLAN.md) for the roadmap and [AGENTS.md](AGENTS.md) for contributor and agent guidelines.

## License

[MIT](LICENSE). Not affiliated with the tududi project.
