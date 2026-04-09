.PHONY: up down logs db-shell status api web

# Infrastructure (Docker — Postgres + Redis only)
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

db-shell:
	docker compose exec postgres psql -U homebase -d homebase

status:
	docker compose ps

# App services (run natively on host)
api:
	cd services/api && source .venv/bin/activate && uvicorn services.api.src.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd services/web && npm run dev
