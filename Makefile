COMPOSE := docker compose -f dev/docker-compose.yml
UV_RUN := uv run --with aiohttp

.PHONY: dev-up dev-down dev-reset dev-logs dev-bootstrap dev-restart-ha \
	test test-integration lint format

dev-up:
	$(COMPOSE) up -d
	$(UV_RUN) dev/bootstrap.py

dev-bootstrap:
	$(UV_RUN) dev/bootstrap.py

dev-down:
	$(COMPOSE) down

dev-reset:
	$(COMPOSE) down -v
	find dev/ha-config -mindepth 1 -maxdepth 1 ! -name configuration.yaml ! -name custom_components -exec rm -rf {} +
	rm -f dev/.secrets.env
	$(MAKE) dev-up

dev-restart-ha:
	$(COMPOSE) restart homeassistant

dev-logs:
	$(COMPOSE) logs -f --tail=100

test:
	uv run pytest

# Requires the dev stack (make dev-up). Runs without the HA pytest plugin so
# real network access to the tududi container is allowed.
test-integration:
	uv run pytest -p no:homeassistant -o asyncio_mode=auto tests/integration

lint:
	uv run ruff check .
	uv run ruff format --check .
	uv run mypy custom_components

format:
	uv run ruff check --fix .
	uv run ruff format .
