# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

HomeBase AI — local-first family home operating system with AI-powered document intelligence, vision analysis, and maintenance automation. New-construction Taylor Morrison home in Celina, Texas.

## Design Documents (precedence: later wins)

- `homebase-ai-merged-build-plan-v2.md` — Full architecture, DB schema, sequential build prompts
- `homebase-ai-v2.1-amendments.md` — Cloud off, multi-property, safety engine, simpler first slice, config routing, offline-first
- `homebase-ai-v2.2-evaluation.md` — Missing features, deployment, voice ingestion, HA deferred
- `homebase-ai-v2.3-tech-stack-final.md` — Final tech stack (Next.js + React), component ecosystem, design system, performance
- `homebase-ai-claude-code-prompt.md` — Phase 0 step-by-step prompts, working rules, canonical file structure

Always follow these documents. If they conflict, later version wins.

## Commands

```bash
# Infrastructure
make up                    # Start Postgres + Redis via Docker Compose
make down                  # Stop all services
make logs                  # Tail service logs
make db-shell              # Connect to Postgres
make status                # Show running containers
docker compose config      # Validate compose file after changes

# Backend (services/api/)
pip install -r services/api/requirements.txt
uvicorn services.api.src.main:app --reload --port 8000
curl http://localhost:8000/api/v1/health

# Database migrations
cd services/api && alembic revision --autogenerate -m "description"
cd services/api && alembic upgrade head

# Frontend (services/web/)
cd services/web && npm install
cd services/web && npm run dev          # Dev server on port 3000

# Ollama (runs on host, not in Docker)
bash scripts/setup-ollama.sh            # Pull nomic-embed-text + qwen2.5:7b
curl http://localhost:11434/api/tags    # Verify models available

# Test an endpoint
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "file=@test.pdf" -F "property_id=<uuid>" -F "doc_type=warranty" -F "title=Test"
curl -X POST http://localhost:8000/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What does my warranty cover?", "property_id": "<uuid>"}'
```

## Architecture

Six internal systems compose the app:

1. **Home Graph** — Structured property → rooms → systems → assets → warranties/insurance. All entities keyed by `property_id` for multi-property support.
2. **Document Brain** — Upload → extract text (pypdf) → classify → chunk (recursive character split, 800 tokens, 200 overlap) → embed (nomic-embed-text, 768 dims) → store in pgvector → entity-link.
3. **Vision Copilot** — Photo Q&A, damage triage, fixture ID, plant diagnosis via llava:13b.
4. **Task & Maintenance Engine** — Recurring schedules, seasonal checklists (regional presets in `config/`), service logs.
5. **Agent & Tool Layer** — Adaptive model routing (`config/model-routing.yaml`), safety policy (`config/safety-rules.yaml`), cloud fallback (OFF by default, opt-in only).
6. **Family Workspace** — Auth (Supabase, Phase 3), roles, audit logs, AI provenance.

### Request flow (RAG)

```
User question → embed question → pgvector cosine similarity search (top 5 chunks)
→ assemble prompt with chunk context + source attribution → Ollama qwen2.5:7b → cited answer
```

### Service layout

```
services/
  api/          # FastAPI backend — routers/, models/, schemas/, services/, utils/
  web/          # Next.js App Router frontend — app/, components/, lib/, hooks/, types/
  worker/       # Background tasks — ingestion, embeddings, reminders, backup
config/         # model-routing.yaml, safety-rules.yaml, maintenance presets, checklists
seeds/          # Dev seed data (celina-cottontail.json) — NOT hardcoded in app logic
scripts/        # setup-ollama.sh, backup.sh, restore.sh
```

### Key architectural decisions

- **Ollama runs on host** (not Docker) for GPU access and performance
- **Cloud fallback disabled by default** — local models answer first, cloud is explicit opt-in with budget cap
- **No auth in Phase 0** — Supabase Auth added in Phase 3
- **Celina property is seed data** — no hardcoded property references in application logic (v2.1 Amendment 2)
- **pgvector for embeddings** — 768-dim vectors from nomic-embed-text, cosine distance search

## Working Rules (Non-Negotiable)

- **Never rewrite working code.** Extend and refactor small pieces.
- **One feature at a time.** Complete, test, commit, then move on.
- **Every commit must leave the app runnable.** New code must not break existing functionality.
- **Stop and discuss before making breaking changes.**
- **Test before moving on:** backend → curl test; frontend → verify render; Docker → `docker compose config`; DB → verify migration on fresh DB.
- **TypeScript strict mode**, Python type hints on all functions, Pydantic models for all API types.
- **No hardcoded secrets** (use `.env`), no hardcoded property data (use seeds).
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- **Commit after each completed unit** — one endpoint, one component, one config change.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | FastAPI (Python 3.12+) |
| Database | Postgres 16 + pgvector → self-hosted Supabase in Phase 3 |
| LLM | Ollama: qwen2.5:7b (primary), gemma3:4b (fast), llava:13b (vision) |
| Embeddings | nomic-embed-text (768 dims) |
| Cache/Queue | Redis |
| Deployment | GitHub → self-hosted runner → Docker Compose + Caddy |

## Build Phases

| Phase | Scope |
|-------|-------|
| 0 | Infrastructure: scaffold, Docker, FastAPI, DB models, Ollama, ingestion, RAG, minimal UI |
| 1 | Document ingestion: classification (gemma3:4b), smart chunking, entity extraction |
| 2 | AI engine: intent classification, hybrid search, model routing, safety, streaming |
| 3 | Frontend: Supabase auth, app shell, dashboard, chat, document vault, home profile |
| 4-7 | Per design documents |

Use `/init` at session start to scan project state and determine which phase/step to work on.
