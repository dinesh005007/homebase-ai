# HomeBase AI

Local-first family home operating system with AI-powered document intelligence, vision analysis, and maintenance automation.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Ollama](https://ollama.ai/) installed on host
- Node.js 20+ (for frontend)
- Python 3.12+ (for backend)

### Setup

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your values

# 2. Start infrastructure
make up

# 3. Pull AI models
bash scripts/setup-ollama.sh

# 4. Verify
make status
curl http://localhost:8000/api/v1/health
```

### Development Commands

| Command | Description |
|---------|-------------|
| `make up` | Start Postgres + Redis |
| `make down` | Stop all services |
| `make logs` | Tail service logs |
| `make db-shell` | Connect to Postgres |
| `make status` | Show running containers |

## Architecture

- **Backend:** FastAPI (Python) at `services/api/`
- **Frontend:** Next.js (App Router) at `services/web/`
- **Worker:** Background tasks at `services/worker/`
- **LLM:** Ollama on host (qwen2.5:7b, gemma3:4b, llava:13b)
- **Embeddings:** nomic-embed-text (768 dims) via pgvector
- **Database:** PostgreSQL 16 + pgvector
- **Cache:** Redis

## Design Documents

See the `homebase-ai-*.md` files for full architecture and build plans.
