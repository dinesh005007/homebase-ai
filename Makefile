.PHONY: up down logs db-shell status

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
