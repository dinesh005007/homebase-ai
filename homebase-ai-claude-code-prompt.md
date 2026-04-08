# HomeBase AI — Claude Code Master Prompt

Copy this prompt into Claude Code at the start of each working session.
Attach the four design documents as context when starting a new phase.

---

## Project Context

You are building **HomeBase AI**, a local-first family home operating
system with AI-powered document intelligence, vision analysis, and
maintenance automation. The owner is a technical user who just closed
on a new-construction Taylor Morrison home in Celina, Texas.

**Four design documents govern this project:**
- v2: Full architecture, database schema, and sequential build prompts
- v2.1: Six amendments (cloud off, multi-property, safety engine,
  simpler first slice, config routing, offline-first)
- v2.2: Missing features, deployment model, voice ingestion, HA deferred
- v2.3: Final tech stack (Next.js + React), component ecosystem,
  design system, performance optimizations

**Always follow these design documents.** If a decision conflicts
between documents, later versions take precedence (v2.3 > v2.2 > v2.1 > v2).

---

## Working Rules (Non-Negotiable)

### 1. Incremental Development
- **Never rewrite working code.** Add to it, extend it, refactor small
  pieces — but never delete and rebuild a working file from scratch.
- **One feature at a time.** Complete one feature, test it, commit it,
  then move to the next. Never work on two features simultaneously.
- **Each commit must leave the app in a runnable state.** If you add a
  new endpoint, the existing endpoints must still work. If you add a
  new page, existing pages must still render.
- **If a change would break existing functionality, stop and discuss
  the migration path first.** Do not proceed with breaking changes
  without explicit approval.

### 2. Test Before Moving On
- After creating or modifying any backend endpoint: test it with a
  curl command or a simple script. Show the test and its output.
- After creating or modifying any frontend page: verify it renders
  by describing what you see or catching obvious errors.
- After modifying Docker Compose: run `docker compose config` to
  validate the configuration.
- After modifying the database schema: verify the migration runs
  cleanly on a fresh database.

### 3. Code Quality
- **TypeScript strict mode** for all frontend code. No `any` types
  unless absolutely necessary (and document why).
- **Type hints** on all Python functions. Use Pydantic models for
  all API request/response types.
- **No hardcoded secrets.** Everything sensitive goes in .env.
  Use .env.example with placeholder values.
- **No hardcoded property data.** The Celina house is seed data,
  not embedded in application logic (per v2.1 Amendment 2).
- **Comments on non-obvious logic only.** Don't comment what the
  code already says. Do comment why a non-obvious decision was made.

### 4. Git Discipline
- **Commit after each completed unit of work** (one endpoint, one
  component, one configuration change).
- **Commit messages follow conventional commits:**
  feat: add document upload endpoint
  fix: correct chunk overlap calculation
  chore: update Docker compose with Redis service
  refactor: extract embedding logic into shared module
  docs: add API endpoint documentation
  test: add ingestion pipeline integration test
- **Never commit .env, secrets, or large binary files.**
- **.gitignore** must include: .env, node_modules/, __pycache__/,
  .next/, data/, *.pyc, .DS_Store

### 5. File Structure
Follow this exact structure. Do not reorganize without discussion.

```
homebase-ai/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── services/
│   ├── api/                         # FastAPI Python backend
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── alembic/                 # DB migrations
│   │   │   └── versions/
│   │   ├── alembic.ini
│   │   └── src/
│   │       ├── main.py              # FastAPI app entry
│   │       ├── config.py            # Settings from env vars
│   │       ├── database.py          # DB connection + session
│   │       ├── models/              # SQLAlchemy models
│   │       │   ├── __init__.py
│   │       │   ├── property.py
│   │       │   ├── document.py
│   │       │   ├── asset.py
│   │       │   ├── maintenance.py
│   │       │   ├── warranty.py
│   │       │   ├── insurance.py
│   │       │   └── audit.py
│   │       ├── schemas/             # Pydantic request/response
│   │       │   ├── __init__.py
│   │       │   ├── document.py
│   │       │   ├── ask.py
│   │       │   └── vision.py
│   │       ├── routers/             # API route handlers
│   │       │   ├── __init__.py
│   │       │   ├── documents.py
│   │       │   ├── ask.py
│   │       │   ├── vision.py
│   │       │   ├── properties.py
│   │       │   ├── assets.py
│   │       │   ├── maintenance.py
│   │       │   └── health.py
│   │       ├── services/            # Business logic
│   │       │   ├── __init__.py
│   │       │   ├── ingestion.py     # Document processing
│   │       │   ├── rag.py           # RAG query engine
│   │       │   ├── vision.py        # Vision analysis
│   │       │   ├── router.py        # Model routing
│   │       │   ├── safety.py        # Safety policy engine
│   │       │   ├── embeddings.py    # Embedding generation
│   │       │   └── ollama.py        # Ollama client wrapper
│   │       └── utils/
│   │           ├── __init__.py
│   │           └── text.py          # Chunking, tokenization
│   ├── web/                         # Next.js frontend
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── components.json          # shadcn/ui config
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── manifest.json        # PWA manifest
│   │   └── src/
│   │       ├── app/                  # Next.js App Router
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx          # Dashboard
│   │       │   ├── login/
│   │       │   ├── ask/              # AI chat
│   │       │   ├── documents/        # Document vault
│   │       │   ├── home-profile/     # Rooms, systems, assets
│   │       │   ├── maintenance/      # Tasks and calendar
│   │       │   ├── projects/
│   │       │   ├── coverage/         # Insurance + warranty
│   │       │   ├── garden/
│   │       │   ├── theater/
│   │       │   ├── finances/
│   │       │   ├── photos/
│   │       │   ├── smart-home/
│   │       │   └── settings/
│   │       ├── components/
│   │       │   ├── ui/               # shadcn/ui components
│   │       │   ├── layout/           # Sidebar, header, etc.
│   │       │   ├── chat/             # Chat-specific components
│   │       │   ├── documents/        # Document-specific
│   │       │   └── shared/           # Reusable across pages
│   │       ├── lib/
│   │       │   ├── api.ts            # API client (typed)
│   │       │   ├── supabase.ts       # Supabase client config
│   │       │   ├── utils.ts          # Shared utilities
│   │       │   └── store.ts          # Zustand stores
│   │       ├── hooks/                # Custom React hooks
│   │       └── types/                # Shared TypeScript types
│   └── worker/                      # Background task worker
│       ├── Dockerfile
│       ├── requirements.txt
│       └── src/
│           ├── main.py
│           ├── tasks/
│           │   ├── ingestion.py
│           │   ├── embeddings.py
│           │   ├── reminders.py
│           │   └── backup.py
│           └── config.py
├── config/
│   ├── model-routing.yaml           # Adaptive model routing
│   ├── safety-rules.yaml            # Safety policy rules
│   ├── maintenance-presets/
│   │   └── north-texas-clay.json    # Regional maintenance seeds
│   └── checklists/
│       ├── move-in.json
│       └── address-change.json
├── seeds/
│   └── celina-cottontail.json       # Demo/dev seed data
├── scripts/
│   ├── setup-runner.sh
│   ├── setup-ollama.sh
│   ├── backup.sh
│   └── restore.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── Caddyfile
├── Makefile
├── .env.example
├── .gitignore
└── README.md
```

---

## Phase Execution Guide

### How to Use This Prompt

Before each work session with Claude Code:

1. **State which phase and step you're working on:**
   "I'm on Phase 0, Step 2: Database schema with SQLAlchemy models."

2. **Attach relevant design documents** for that phase.

3. **State what already exists:**
   "Docker Compose is running. Postgres is up. Ollama has models pulled.
   The /health endpoint returns 200."

4. **State the goal for this session:**
   "Create the SQLAlchemy models for the core entities: property, room,
   asset, document, document_chunk."

5. **Claude Code works, tests, and commits one unit at a time.**

---

## Phase 0: Infrastructure (Week 0, Days 1-3)

### Step 0.1 — Project Scaffold + Docker Compose

```
Create the HomeBase AI project scaffold.

1. Initialize the directory structure shown above.
   Create placeholder files where needed (empty __init__.py, etc.)

2. Create docker-compose.yml with these services:

   postgres:
     image: pgvector/pgvector:pg16
     environment:
       POSTGRES_DB: homebase
       POSTGRES_USER: homebase
       POSTGRES_PASSWORD: ${DB_PASSWORD}
     volumes:
       - ./data/postgres:/var/lib/postgresql/data
     ports:
       - "5432:5432"
     healthcheck:
       test: ["CMD-SHELL", "pg_isready -U homebase"]
       interval: 5s
       timeout: 5s
       retries: 5

   redis:
     image: redis:7-alpine
     volumes:
       - ./data/redis:/data
     ports:
       - "6379:6379"

   Note: Supabase services come later. Start with plain Postgres
   for Week Zero to keep things simple. We will add Supabase Auth
   and Storage in Phase 3 when we build the frontend.

3. Create .env.example:
   DB_PASSWORD=change_me_in_production
   DATABASE_URL=postgresql://homebase:${DB_PASSWORD}@localhost:5432/homebase
   OLLAMA_HOST=http://localhost:11434
   REDIS_URL=redis://localhost:6379/0

4. Create .gitignore (comprehensive for Python + Node + Docker)

5. Create Makefile with targets:
   up, down, logs, db-shell, status

6. Create README.md with project description and setup instructions.

7. Test: run `make up` and verify Postgres and Redis start.
   Run `make db-shell` and verify you can connect.

Commit: "chore: initial project scaffold with Docker Compose"
```

### Step 0.2 — FastAPI Foundation + Health Endpoint

```
Create the FastAPI application skeleton.

1. Create services/api/requirements.txt:
   fastapi==0.115.*
   uvicorn[standard]==0.34.*
   sqlalchemy==2.0.*
   asyncpg==0.30.*
   alembic==1.14.*
   pgvector==0.3.*
   pydantic==2.10.*
   pydantic-settings==2.7.*
   python-multipart==0.0.*
   httpx==0.28.*
   structlog==24.*

2. Create services/api/src/config.py:
   Pydantic Settings class loading from environment variables:
   DATABASE_URL, OLLAMA_HOST, REDIS_URL, LOG_LEVEL

3. Create services/api/src/database.py:
   Async SQLAlchemy engine + session factory
   Using asyncpg driver
   Include a get_db dependency for FastAPI

4. Create services/api/src/main.py:
   FastAPI app with:
   - CORS middleware (allow localhost origins)
   - Lifespan handler that tests DB connection on startup
   - Include router from routers/health.py

5. Create services/api/src/routers/health.py:
   GET /api/v1/health → returns {status: "ok", database: "connected",
   ollama: "connected|unavailable", version: "0.1.0"}
   Actually ping the database and Ollama to verify.

6. Create services/api/Dockerfile:
   Python 3.12 slim base
   Install dependencies
   Run with uvicorn, host 0.0.0.0, port 8000

7. Add api service to docker-compose.yml:
   Depends on postgres
   Maps port 8000
   Mounts .env
   Uses the homebase network

8. Test: `make up` then `curl http://localhost:8000/api/v1/health`
   Should return JSON with status ok and database connected.
   Ollama may show unavailable if not running — that's fine.

Commit: "feat: FastAPI skeleton with health endpoint"
```

### Step 0.3 — Database Models (Core Entities Only)

```
Create SQLAlchemy models for the CORE entities needed for Week Zero.
We are NOT creating the full schema yet — only what's needed to
upload a document, chunk it, embed it, and answer questions.

1. Create services/api/src/models/base.py:
   Base declarative model with:
   - id: UUID primary key (server default uuid_generate_v4)
   - created_at: timestamp with timezone (server default now())
   - updated_at: timestamp with timezone (onupdate now())

2. Create services/api/src/models/property.py:
   Property model with fields from v2 schema (simplified for now):
   id, name, address_line1, city, state, zip_code, builder,
   builder_model, purchase_date, metadata (JSONB)

3. Create services/api/src/models/document.py:
   Document model:
   id, property_id (FK), title, doc_type (enum string),
   file_path, file_size_bytes, mime_type, page_count,
   ocr_text_summary, ingested_at, metadata (JSONB)

   DocumentChunk model:
   id, document_id (FK), chunk_index (int), content (text),
   token_count (int), embedding (Vector(768) from pgvector),
   page_number, section_header, metadata (JSONB)

4. Create services/api/src/models/__init__.py:
   Import all models so Alembic discovers them.

5. Set up Alembic:
   alembic init services/api/alembic
   Configure alembic.ini and env.py to use DATABASE_URL from config
   Configure env.py for async (use asyncpg)
   Use `target_metadata = Base.metadata` from models

6. Generate initial migration:
   alembic revision --autogenerate -m "initial core models"

7. Run migration:
   alembic upgrade head

8. Verify: connect to Postgres and confirm tables exist:
   properties, documents, document_chunks
   Confirm the vector extension is enabled:
   SELECT * FROM pg_extension WHERE extname = 'vector';

9. Create a simple seed script (scripts/seed_dev.py) that creates
   one property record:
   809 Cottontail Way, Celina, TX 75009
   Builder: Taylor Morrison, Model: Bordeaux
   Purchase date: 2026-03-25

Commit: "feat: core database models with Alembic migration"
```

### Step 0.4 — Ollama Setup + Embedding Service

```
Set up Ollama model pulling and create the embedding service.

1. Create scripts/setup-ollama.sh:
   #!/bin/bash
   echo "Pulling models for HomeBase AI..."
   ollama pull nomic-embed-text
   ollama pull qwen2.5:7b
   echo "Testing nomic-embed-text..."
   curl -s http://localhost:11434/api/embed -d '{
     "model": "nomic-embed-text",
     "input": "test embedding"
   }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Embedding dims: {len(d[\"embeddings\"][0])}')"
   echo "Testing qwen2.5:7b..."
   curl -s http://localhost:11434/api/generate -d '{
     "model": "qwen2.5:7b",
     "prompt": "Say hello in one sentence.",
     "stream": false
   }' | python3 -c "import sys,json; print(json.load(sys.stdin)['response'])"
   echo "Models ready."

   Note: Ollama runs natively on the host, NOT in Docker (for now).
   This gives better performance and simpler GPU access.

2. Create services/api/src/services/ollama.py:
   OllamaClient class wrapping httpx:
   - embed(text: str) -> list[float]
     POST {OLLAMA_HOST}/api/embed with model=nomic-embed-text
   - embed_batch(texts: list[str]) -> list[list[float]]
     Embed multiple texts with rate limiting (max 5 concurrent)
   - generate(prompt: str, model: str, system: str = None,
     stream: bool = False) -> str | AsyncGenerator
     POST {OLLAMA_HOST}/api/generate
   - health() -> bool
     Check if Ollama is reachable

   All methods async. Proper error handling with retries (3 attempts,
   exponential backoff). Timeout: 60 seconds for generate, 30 for embed.

3. Create services/api/src/services/embeddings.py:
   EmbeddingService class:
   - embed_text(text: str) -> list[float]
   - embed_chunks(chunks: list[str]) -> list[list[float]]
   Uses OllamaClient internally.

4. Test: Run the setup script. Then test the embedding service
   from a Python shell:
   client = OllamaClient("http://localhost:11434")
   vec = await client.embed("Taylor Morrison warranty coverage")
   assert len(vec) == 768

Commit: "feat: Ollama client and embedding service"
```

### Step 0.5 — Document Upload + Ingestion Pipeline

```
Build the minimal document upload and ingestion pipeline.
This is the CORE of Week Zero.

1. Create services/api/src/utils/text.py:
   chunk_text(text: str, chunk_size: int = 800,
              overlap: int = 200) -> list[dict]
   Returns list of {content, chunk_index, token_count}
   Use a simple recursive character splitter:
   - Split on "\n\n" first (paragraphs)
   - If chunk too large, split on "\n" (lines)
   - If still too large, split on ". " (sentences)
   - If still too large, split on " " (words)
   Each chunk includes overlap from previous chunk.
   Count tokens approximately (len(text) / 4).

2. Add to services/api/requirements.txt:
   pypdf==5.*
   pytesseract==0.3.*

3. Create services/api/src/services/ingestion.py:
   IngestionService class:

   async def ingest_document(
     file_path: str,
     filename: str,
     property_id: UUID,
     doc_type: str,
     title: str,
     db: AsyncSession
   ) -> Document:

     Steps:
     a. Read file bytes, determine mime type
     b. If PDF: extract text with pypdf
        - If text extraction yields < 100 chars per page, log warning
          (OCR support comes later — skip for now)
     c. Store file locally at data/documents/{property_id}/{filename}
        (Supabase Storage comes later)
     d. Chunk the extracted text using chunk_text()
     e. Generate embeddings for all chunks using EmbeddingService
     f. Create Document record in database
     g. Create DocumentChunk records with embeddings in database
     h. Return the Document record

   Include: proper error handling, logging with structlog,
   and a progress callback for future SSE integration.

4. Create services/api/src/routers/documents.py:

   POST /api/v1/documents/upload
   Accepts: multipart form with file + property_id + doc_type + title
   Calls IngestionService.ingest_document()
   Returns: {document_id, title, doc_type, chunks_created, status}

   GET /api/v1/documents?property_id=X
   Returns: list of documents with metadata (no chunks)

5. Register the documents router in main.py.

6. Test with curl:
   # Create a test PDF or use any PDF you have
   curl -X POST http://localhost:8000/api/v1/documents/upload \
     -F "file=@test-warranty.pdf" \
     -F "property_id=<uuid-from-seed>" \
     -F "doc_type=warranty" \
     -F "title=Taylor Morrison Warranty Packet"

   Verify response shows chunks_created > 0.
   Verify in database: document record exists, chunks have embeddings.

Commit: "feat: document upload and ingestion pipeline"
```

### Step 0.6 — RAG Query Endpoint (The Core Test)

```
Build the minimal RAG query endpoint. This is the moment of truth
for Week Zero.

1. Create services/api/src/services/rag.py:
   RAGService class:

   async def ask(
     question: str,
     property_id: UUID,
     db: AsyncSession
   ) -> dict:

     Steps:
     a. Generate embedding for the question using EmbeddingService
     b. Vector search in document_chunks table:
        SELECT id, document_id, content, page_number, section_header,
               1 - (embedding <=> query_embedding) as similarity
        FROM document_chunks
        WHERE document_id IN (
          SELECT id FROM documents WHERE property_id = :property_id
        )
        ORDER BY embedding <=> query_embedding
        LIMIT 5;
     c. Fetch parent document titles for source attribution
     d. Assemble prompt:
        System: "You are HomeBase AI, a knowledgeable home assistant.
        Answer the user's question based ONLY on the provided context.
        Always cite your sources with [Source: document_title, page X].
        If the context doesn't contain the answer, say so honestly."

        Context: {top 5 chunks with source info}
        Question: {user's question}
     e. Call Ollama generate with model=qwen2.5:7b
     f. Return {answer, sources: [{title, page, similarity}],
               model_used, latency_ms}

2. Create services/api/src/schemas/ask.py:
   AskRequest: question (str), property_id (UUID)
   AskResponse: answer (str), sources (list), model_used (str),
                latency_ms (int)

3. Create services/api/src/routers/ask.py:
   POST /api/v1/ask
   Accepts: AskRequest JSON body
   Returns: AskResponse

4. Register the ask router in main.py.

5. TEST — This is the critical validation:

   curl -X POST http://localhost:8000/api/v1/ask \
     -H "Content-Type: application/json" \
     -d '{
       "question": "Is grout cracking covered under warranty?",
       "property_id": "<uuid>"
     }'

   Expected: A factual answer citing the warranty document with
   page numbers. The answer should reference specific warranty terms
   from the Taylor Morrison warranty packet.

   Test at least 5 questions:
   1. "Is grout cracking covered under warranty?"
   2. "What is my insurance deductible?"
   3. "What does my HOA say about fences?"
   4. "When does my builder warranty expire?"
   5. "What are the paint color restrictions in my HOA?"

   For each: verify the answer is correct and cites the right source.

Commit: "feat: RAG query endpoint with vector search"
```

### Step 0.7 — Minimal Web UI (Week Zero Frontend)

```
Create a minimal Next.js frontend to validate the full pipeline
through a browser interface. This is NOT the final UI — it's a
proof-of-concept.

1. Initialize Next.js in services/web/:
   npx create-next-app@latest . --typescript --tailwind --app \
     --src-dir --import-alias "@/*" --no-eslint

2. Install shadcn/ui:
   npx shadcn@latest init
   npx shadcn@latest add button card input textarea badge scroll-area

3. Create a single page at src/app/page.tsx:

   Layout: centered container, max-w-3xl, clean white background

   Top section: "HomeBase AI" title + subtitle "Week Zero"

   Upload section:
   - File input (accepts .pdf)
   - Text inputs for: title, doc_type (dropdown: warranty, insurance,
     hoa, closing, manual, other)
   - "Upload & Process" button
   - Status message showing: "Processed: 47 chunks indexed"

   Chat section:
   - Text input for questions
   - "Ask" button
   - Response area showing:
     - The AI answer (rendered as text)
     - Source citations as badges below the answer
       [📄 TM Warranty, p.12 (0.94)]
     - Model used and latency
   - Loading state while waiting for response

   API calls go directly to http://localhost:8000/api/v1/
   (no proxy needed for Week Zero — CORS is already configured)

4. Create services/web/Dockerfile (multi-stage, standalone output)

5. Add web service to docker-compose.yml:
   Port 3000, depends on api

6. Test: Open http://localhost:3000
   - Upload a PDF → see "X chunks indexed" confirmation
   - Ask a question → see answer with source citations
   - Verify the full pipeline: upload → chunk → embed → search → answer

Commit: "feat: minimal Week Zero web interface"
```

---

## After Week Zero: Decision Point

After completing Steps 0.1 through 0.7, you have a working pipeline:
**Upload PDF → Ask Question → Get Cited Answer**

**Evaluate:**
1. Are the RAG answers correct and citing the right pages?
2. Is the retrieval finding the most relevant chunks?
3. Is the Ollama response time acceptable (< 15 seconds)?

**If yes:** Proceed to Phase 1 (full document ingestion with
classification, entity extraction, and smart chunking).

**If no:** Debug retrieval quality before building more features:
- Try adjusting chunk_size (smaller chunks = more precise retrieval)
- Try adjusting the number of retrieved chunks (3 vs 5 vs 7)
- Check if the embedding model is appropriate
- Verify chunks aren't split in the middle of important sections

---

## Phase 1+ Execution Pattern

For all subsequent phases, follow this same pattern:

1. **Read the relevant prompt from v2** (e.g., Prompt 1.1 for
   document ingestion pipeline).
2. **Check the amendments** in v2.1, v2.2, v2.3 for any modifications
   to that prompt.
3. **Break the prompt into atomic steps** (one endpoint, one component,
   one service class at a time).
4. **Implement each step, test it, commit it.**
5. **Never break existing functionality.**
6. **When adding a new page to the frontend:** first create it as a
   stub (just the route + layout + "Coming soon" text), then flesh
   out the content in subsequent commits.

### Phase 1 Steps (after Week Zero):
```
1.1  Add document classification service (gemma3:4b integration)
1.2  Add smart chunking per document type
1.3  Add structured field extraction per document type
1.4  Add entity-linking service
1.5  Add batch upload endpoint
1.6  Add document reprocessing endpoint
```

### Phase 2 Steps:
```
2.1  Add intent classification to the ask endpoint
2.2  Add hybrid search (semantic + keyword with RRF)
2.3  Add home graph context assembly
2.4  Add tool calling with Ollama
2.5  Add model routing (config-driven from model-routing.yaml)
2.6  Add safety policy engine (from safety-rules.yaml)
2.7  Add SSE streaming for responses
2.8  Add conversation history storage and retrieval
```

### Phase 3 Steps:
```
3.1  Set up Supabase (replace plain Postgres with full Supabase stack)
3.2  Add Supabase Auth (login page, JWT middleware, two accounts)
3.3  Build app shell (sidebar, layout, navigation, dark mode)
3.4  Build dashboard page with real data
3.5  Build AI chat page with streaming + photo attachment
3.6  Build document vault page with upload + search + viewer
3.7  Build home profile page (rooms, systems, assets)
3.8  Install design components (Framer Motion, cmdk, Sonner, Vaul)
3.9  Add command palette (Cmd+K global search)
3.10 Polish: animations, loading states, empty states, error boundaries
```

Continue this pattern through Phases 4-7 per the design documents.

---

## Quick Reference: Key Decisions

| Decision | Answer |
|----------|--------|
| Frontend framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| Backend | FastAPI (Python) |
| Database | Postgres 16 + pgvector (Supabase later) |
| LLM runtime | Ollama (host-installed, not Docker) |
| Primary model | qwen2.5:7b |
| Fast model | gemma3:4b |
| Vision model | llava:13b |
| Embeddings | nomic-embed-text (768 dims) |
| Cloud fallback | OFF by default. Opt-in only. |
| Auth | Supabase Auth (added in Phase 3) |
| File storage | Local filesystem → Supabase Storage in Phase 3 |
| Speech-to-text | faster-whisper-server (added in Phase 3+) |
| Deployment | GitHub → self-hosted runner → Docker Compose |
| Home Assistant | Deferred until HA hardware is set up |
