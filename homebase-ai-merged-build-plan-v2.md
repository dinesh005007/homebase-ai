# HomeBase AI — Merged Build Plan v2

**A local-first family home operating system with a linked home graph,
adaptive multimodal AI copilot, and private document intelligence vault.**

*For 809 Cottontail Way, Celina, TX 75009 — Taylor Morrison Bordeaux*

---

## Design Philosophy

This is not a document dump with a chatbot. It is a **home graph** — a
structured knowledge system where every document, photo, asset, task,
warranty, and sensor reading links back to both a **property** and one
or more **home entities**. The AI copilot is a lens over this graph,
not a standalone feature.

**One-line summary:** Build a local-first family home operating system
where documents, photos, assets, and maintenance history all become
linked entities, and use Ollama + adaptive multimodal routing + cloud
fallback as the copilot layer over that private home graph.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR HOME NETWORK                        │
│                                                              │
│  ┌───────────────┐   ┌────────────────┐   ┌──────────────┐ │
│  │ Synology NAS  │   │  Mini PC /     │   │    Home      │ │
│  │               │   │  Laptop        │   │  Assistant   │ │
│  │ • NAS backups │   │                │   │              │ │
│  │ • Archive     │◄──│ • Supabase     │──►│ • Aqara      │ │
│  │   storage     │   │   (Postgres +  │   │ • Reolink    │ │
│  │               │   │    pgvector +  │   │ • Sensors    │ │
│  └───────────────┘   │    Auth +      │   │ • Climate    │ │
│                      │    Storage)    │   └──────────────┘ │
│                      │ • Ollama       │                     │
│                      │ • Next.js App  │                     │
│                      │ • Redis        │                     │
│                      │ • Caddy        │                     │
│                      └───────┬────────┘                     │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │ Tailscale (secure tunnel)
                               ▼
                     ┌──────────────────┐
                     │  Cloud Fallback  │
                     │  Claude API      │
                     │  • Multi-doc     │
                     │    reasoning     │
                     │  • Complex       │
                     │    vision        │
                     │  • Explicit,     │
                     │    logged, user- │
                     │    approved only │
                     └──────────────────┘
```

### Six Internal Systems

Every feature belongs to one of these six systems:

| # | System | Purpose |
|---|--------|---------|
| 1 | **Home Graph** | Structured record of property, rooms, systems, assets, materials, paint, vendors, warranties, insurance, HOA rules, and their relationships |
| 2 | **Document Brain** | Ingest, OCR, classify, chunk, embed, entity-link, and version all home documents |
| 3 | **Vision Copilot** | Photo-based Q&A: damage triage, fixture ID, plant diagnosis, paint matching, theatre device recognition, insurance inventory capture |
| 4 | **Task & Maintenance Engine** | Recurring schedules, seasonal checklists, reminders, service intervals, project plans, shopping lists, service logs |
| 5 | **Agent & Tool Layer** | Adaptive model routing, tool calling (OCR, retrieval, scheduling, estimation, linking), cloud fallback orchestration |
| 6 | **Family Workspace** | Auth, roles, audit logs, AI provenance, sharing, exports |

### Hardware Recommendation

| Component | Role | Cost |
|-----------|------|------|
| Beelink SER7 (AMD 7840HS, 32GB RAM, 1TB NVMe) | All services: Supabase, Ollama, Next.js, Redis, Caddy | ~$450 one-time |
| Synology NAS (already owned) | Encrypted backups, archive storage, media | $0 |
| Home Assistant (already planned) | Smart home data source via REST/WebSocket API | $0 |
| Tailscale free tier | Secure remote access, no port forwarding | $0 |
| Claude API (fallback only) | Complex reasoning, multi-doc analysis, high-quality vision | ~$10-30/mo |

**Upgrade path:** If local vision feels slow, a used NVIDIA RTX 3060
12GB desktop (~$200 used) dramatically improves multimodal inference.

### Why Self-Hosted Supabase (Not Plain Postgres)

Self-hosted Supabase gives you Postgres + pgvector + auth + file storage
+ row-level security + REST API + a dashboard — all in one Docker
Compose stack. You would end up rebuilding auth, storage patterns, and
access-control ergonomics that Supabase already provides.

**Optimization note:** Disable Supabase services you don't need in v1
(Realtime, Edge Functions, Logflare) to reduce the container count from
~13 to ~8. Keep: PostgreSQL, GoTrue (auth), Storage API, PostgREST,
Kong (API gateway), Studio (admin dashboard).

### Why pgvector Inside Supabase (Not Separate Chroma)

Your document corpus will be thousands of chunks, not millions. pgvector
with IVFFlat or HNSW indexes handles this easily. Keeping vectors in the
same database as your entity data means:
- Entity-linked vector search in a single SQL query
- One backup target instead of two
- No sync issues between a graph DB and a vector DB
- Simpler Docker stack

---

## Data Model: The Home Graph

The core architectural insight: **everything links to a property AND
one or more home entities.** A photo of a water stain links to the room,
the plumbing system, the relevant warranty, the maintenance task it
spawned, and the contractor who fixed it.

### Prompt 0.1 — Database Schema

```
You are building the database schema for "HomeBase AI," a local-first
family home operating system. The database is PostgreSQL with pgvector,
managed via Prisma ORM inside a self-hosted Supabase stack.

DESIGN PRINCIPLES:
- Everything links back to BOTH a property AND one or more home entities
- This is a HOME GRAPH, not flat tables — relationships are first-class
- Use JSONB for extensible metadata on every major entity
- All tables get created_at, updated_at timestamps
- Append-only audit trail for AI actions and data access
- Row-level security (RLS) policies for multi-user access
- pgvector columns use vector(768) for nomic-embed-text dimensions

Create the full Prisma schema + raw SQL migration for these entities:

--- CORE IDENTITY ---

household
  id, name, created_at

user_account
  id, household_id, email, display_name, role enum [owner_admin,
  household_member, guest_readonly, contractor_portal], created_at

property
  id, household_id, address_line1, address_line2, city, state, zip,
  timezone, latitude, longitude, home_type enum, year_built, builder,
  builder_model, sqft, lot_size_sqft, stories, purchase_date,
  purchase_price, current_value_estimate, metadata JSONB

--- SPATIAL STRUCTURE ---

room
  id, property_id, name, floor, room_type enum [living, kitchen,
  dining, primary_bedroom, bedroom, primary_bath, bathroom, office,
  laundry, garage, patio, backyard, front_yard, theater, pantry,
  mudroom, hallway, attic, basement, closet, utility, other],
  sqft, notes, metadata JSONB

zone
  id, property_id, name, zone_type enum [hvac_zone, irrigation_zone,
  electrical_circuit, plumbing_zone, garden_bed, security_zone],
  description, rooms (many-to-many)

--- HOME SYSTEMS ---

home_system
  id, property_id, system_type enum [hvac, plumbing, electrical,
  roofing, foundation, irrigation, security, network, solar,
  water_heater, septic, theater_av, garage_door, pool],
  brand, model, install_date, expected_lifespan_years, notes,
  metadata JSONB

--- ASSETS ---

asset
  id, property_id, room_id (nullable), system_id (nullable),
  name, asset_type enum [appliance, fixture, electronics,
  theater_device, tool, furniture, outdoor_equipment, insured_valuable,
  smart_device, other],
  brand, model, serial_number, purchase_date, install_date,
  purchase_price, receipt_url, manual_url, photo_url,
  status enum [active, needs_repair, replaced, disposed],
  metadata JSONB

asset_component
  id, asset_id, name, part_number, replacement_interval_days,
  last_replaced, next_replacement, notes

--- MATERIALS & FINISHES ---

material_record
  id, property_id, room_id (nullable), material_type enum [paint,
  flooring, countertop, tile, hardware, trim, siding, roofing_material],
  brand, product_name, color_name, color_code, finish, location_notes,
  purchase_date, retailer, metadata JSONB

--- DOCUMENTS ---

document
  id, property_id, uploaded_by, title, doc_type enum [warranty,
  insurance_policy, hoa_ccr, hoa_architectural, closing_deed,
  closing_settlement, inspection_report, manual, permit, receipt,
  invoice, contractor_quote, photo_scan, email_attachment, other],
  file_url, file_size_bytes, mime_type, page_count, ocr_text_summary,
  classification_confidence, version, is_current boolean,
  ingested_at, metadata JSONB

document_chunk
  id, document_id, chunk_index, content text, token_count int,
  embedding vector(768), page_number, section_header,
  metadata JSONB

document_entity_link
  id, document_id, entity_type enum [property, room, asset,
  home_system, warranty, insurance_policy, hoa_rule, vendor,
  project, maintenance_task, plant],
  entity_id uuid, link_type enum [about, warranty_for, manual_for,
  receipt_for, invoice_for, permit_for, inspection_of, policy_for],
  confidence, created_by enum [user, ai]

--- WARRANTIES ---

warranty
  id, property_id, asset_id (nullable), system_id (nullable),
  warranty_type enum [builder_workmanship, builder_mechanical,
  builder_structural, manufacturer, extended, home_warranty_plan],
  provider, coverage_description, start_date, end_date,
  claim_phone, claim_email, claim_url, document_id (nullable),
  notes, metadata JSONB

--- INSURANCE ---

insurance_policy
  id, property_id, provider, policy_number, policy_type enum
  [homeowners, flood, umbrella, earthquake],
  premium_annual, deductible, dwelling_coverage,
  personal_property_coverage, liability_coverage,
  start_date, end_date, renewal_date,
  agent_name, agent_phone, agent_email,
  document_id (nullable), endorsements JSONB, notes

--- HOA ---

hoa_rule
  id, property_id, rule_category enum [fencing, exterior_paint,
  landscaping, signage, parking, satellite_dish, solar_panels,
  holiday_decorations, noise, pets, rental_restrictions,
  architectural_review, assessments, general],
  title, rule_text, source_document_id, source_page,
  requires_approval boolean, approval_process text, notes

--- VENDORS & SERVICE ---

vendor
  id, household_id, name, trade enum [plumber, electrician, hvac,
  roofer, painter, landscaper, handyman, pest_control, pool,
  general_contractor, av_specialist, locksmith, cleaning, other],
  phone, email, website, license_number, insurance_verified boolean,
  rating int, notes

service_event
  id, property_id, asset_id (nullable), system_id (nullable),
  vendor_id (nullable), warranty_id (nullable),
  event_type enum [repair, maintenance, inspection, installation,
  warranty_claim, emergency],
  title, description, date_performed, cost,
  photos text[], document_ids uuid[], notes

--- MAINTENANCE ---

maintenance_task
  id, property_id, room_id (nullable), asset_id (nullable),
  system_id (nullable), schedule_id (nullable),
  title, description, task_type enum [preventive, repair,
  inspection, seasonal, diy, professional, warranty_check],
  priority enum [low, medium, high, urgent],
  status enum [pending, scheduled, in_progress, completed,
  skipped, deferred],
  due_date, completed_date, completed_by,
  recurrence_rule text, cost, estimated_minutes,
  diy_difficulty enum [easy, moderate, hard, professional_only],
  contractor_name, contractor_phone,
  photos text[], notes, metadata JSONB

maintenance_schedule
  id, property_id, title, description, category enum [hvac,
  plumbing, electrical, exterior, interior, landscape, seasonal,
  safety, theater, appliance],
  recurrence_rule, season enum [spring, summer, fall, winter, any],
  applicable_asset_types text[],
  estimated_cost_low, estimated_cost_high,
  diy_instructions text, is_active boolean

--- PROJECTS ---

project
  id, property_id, title, description, project_type enum
  [renovation, repair, improvement, landscaping, painting, diy,
  theater_setup, smart_home, other],
  status enum [idea, planning, approved, in_progress, paused,
  completed, cancelled],
  budget, actual_cost, start_date, target_end_date, actual_end_date,
  contractor_id (nullable), hoa_approval_required boolean,
  hoa_approval_status enum [not_needed, pending, approved, denied],
  permit_required boolean, permit_ids uuid[],
  before_photos text[], after_photos text[],
  document_ids uuid[], notes

project_task
  id, project_id, title, description, status enum, sort_order,
  estimated_cost, actual_cost, assigned_to, due_date,
  completed_date, notes

--- GARDEN ---

plant
  id, property_id, zone_id (nullable), room_id (nullable),
  common_name, scientific_name, plant_type enum [tree, shrub,
  perennial, annual, grass, vegetable, herb, houseplant, vine],
  location_description, planted_date, source,
  hardiness_zone text, sun_requirement enum,
  water_frequency text, last_fertilized, last_pruned,
  health_status enum [healthy, stressed, diseased, dormant, dead],
  photo_url, notes

--- SHOPPING ---

shopping_list
  id, property_id, project_id (nullable), task_id (nullable),
  title, status enum [active, completed, archived]

shopping_item
  id, list_id, name, quantity, unit, estimated_cost,
  purchased boolean, actual_cost, store, url, notes

--- SMART HOME ---

sensor_reading
  id, property_id, entity_id text, sensor_type enum [temperature,
  humidity, water_leak, door_window, motion, power, air_quality,
  battery_level], value numeric, unit text, room_id (nullable),
  timestamp timestamptz
  -- Consider TimescaleDB hypertable for this table

alert
  id, property_id, source enum [sensor, schedule, ai, manual, vision],
  source_entity_type text, source_entity_id uuid,
  title, body, severity enum [info, warning, urgent, emergency],
  suggested_actions JSONB, acknowledged boolean, acknowledged_by,
  acknowledged_at, created_at

--- AI & AUDIT ---

ai_run
  id, property_id, user_id, run_type enum [chat, vision, classify,
  extract, generate, tool_call],
  query text, response text, model_used text,
  is_cloud_fallback boolean, source_chunk_ids uuid[],
  tokens_input int, tokens_output int, latency_ms int,
  confidence numeric, feedback enum [positive, negative, none],
  created_at

ai_tool_call
  id, ai_run_id, tool_name text, tool_input JSONB,
  tool_output JSONB, duration_ms int, created_at

audit_event
  id, household_id, user_id, action enum [create, read, update,
  delete, login, logout, export, ai_query, ai_generate,
  document_access, cloud_api_call],
  entity_type text, entity_id uuid,
  details JSONB, ip_address text, created_at
  -- Append-only: no UPDATE or DELETE allowed on this table

--- INDEXES ---

Create:
- GIN indexes on all JSONB columns
- HNSW index on document_chunk.embedding (vector_cosine_ops)
- Full-text search (tsvector) index on document_chunk.content
- Composite indexes on (property_id, entity_type) for entity links
- Time-based indexes on sensor_reading.timestamp
- Index on warranty.end_date for expiration queries
- Index on maintenance_task.due_date, status for calendar queries

--- SEED DATA ---

Pre-populate with:

Property:
  809 Cottontail Way, Celina, TX 75009
  Builder: Taylor Morrison, Model: Bordeaux
  Closing: March 25, 2026, Timezone: America/Chicago

Default rooms for a 2-story new construction:
  Floor 1: Entry/Mudroom, Living Room, Kitchen, Dining Room,
  Pantry, Laundry Room, Guest Bathroom, Garage (3-car)
  Floor 2: Primary Bedroom, Primary Bathroom, Bedroom 2,
  Bedroom 3, Guest Bathroom 2, Office/Study, Theater Room
  Exterior: Front Yard, Backyard, Patio

Default warranties:
  Taylor Morrison 1-Year Workmanship
    start: 2026-03-25, end: 2027-03-25
  Taylor Morrison 2-Year Mechanical (plumbing, electrical, HVAC)
    start: 2026-03-25, end: 2028-03-25
  Taylor Morrison 10-Year Structural (foundation, load-bearing)
    start: 2026-03-25, end: 2036-03-25

Default insurance:
  GEICO/Homesite, start: 2026-03-25, premium: $1913/year
  renewal_date: 2027-03-25

Default home systems:
  HVAC, Plumbing, Electrical, Roofing, Foundation,
  Irrigation, Security/Cameras, Network (eero 6+),
  Theater AV, Garage Door, Water Heater

Default maintenance schedules:
  (see North Texas seasonal templates in Phase 4 prompt)
```

---

## Prompt 0.2 — Docker Compose Stack

```
Create the Docker Compose stack for HomeBase AI. This runs on a mini PC
(AMD 7840HS, 32GB RAM, 1TB NVMe) with Ubuntu Server 24.04.

SERVICES:

1. Self-hosted Supabase (slim profile):
   - postgres (PostgreSQL 16 + pgvector extension)
   - gotrue (auth)
   - storage-api (file storage)
   - rest (PostgREST API)
   - kong (API gateway)
   - studio (admin dashboard — optional, can disable in prod)
   - meta (Postgres metadata API for Studio)
   Disable: realtime, edge-functions, logflare, analytics, imgproxy
   Reference: https://supabase.com/docs/guides/self-hosting/docker

2. Ollama (latest)
   - CPU mode by default (AMD iGPU ROCm optional)
   - Volume: /data/ollama for model storage
   - Internal port 11434

3. Redis 7
   - For job queue, caching, rate limiting
   - Volume: /data/redis

4. Caddy (reverse proxy)
   - Auto-HTTPS with Tailscale certs or local CA
   - Routes: / → Next.js, /api/v1/* → FastAPI, /supabase/* → Kong
   - Internal-only access to Ollama

5. homebase-api (FastAPI Python service)
   - Document ingestion, RAG engine, vision pipeline, agent layer
   - Connects to Supabase Postgres, Ollama, Redis, Supabase Storage
   - Health check endpoint

6. homebase-web (Next.js)
   - Frontend web app
   - Connects to homebase-api and Supabase client SDK
   - Production build served by built-in Next.js server

7. homebase-worker (Python background worker)
   - Async tasks: document processing, embedding generation,
     scheduled maintenance checks, HA sensor polling, backup jobs
   - Uses Redis as job queue (arq or rq)
   - Shares codebase with homebase-api

CONFIGURATION:

- Shared Docker network: homebase-net
- All volumes under /data/ for easy backup
- Single .env file with:
  SUPABASE_DB_PASSWORD, SUPABASE_JWT_SECRET, SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, OLLAMA_HOST, REDIS_URL,
  CLAUDE_API_KEY (for cloud fallback), HA_URL, HA_TOKEN,
  MINIO/S3 compatible config for Supabase Storage
- .env.example with documented defaults

OPERATIONAL TOOLING:

Makefile with targets:
  make up          — start all services
  make down        — stop all services
  make logs        — tail all logs
  make logs-api    — tail API logs only
  make backup      — full backup to Synology NAS mount
  make restore     — restore from backup
  make pull-models — download/update Ollama models
  make db-migrate  — run Prisma migrations
  make db-seed     — seed initial data
  make status      — health check all services
  make shell-db    — psql into database
  make shell-api   — bash into API container

Backup script:
  - pg_dump compressed → /mnt/nas/backups/homebase/db/
  - Supabase storage rsync → /mnt/nas/backups/homebase/files/
  - Ollama models excluded (re-pullable)
  - Config files (.env, docker-compose, Caddyfile) → backup
  - Encrypted with age (age-encryption.org)
  - 30-day daily retention, weekly archives kept 1 year
  - Runs via cron at 2:00 AM daily
```

### Prompt 0.3 — Ollama Model Setup + Adaptive Router

```
Create the Ollama model setup and adaptive routing layer for HomeBase AI.

PART 1: Model Installation Script (bash)

Pull these models:
  - qwen2.5:7b         — primary reasoning, RAG answers, tool calling
  - gemma3:4b           — fast classifier, tagger, metadata extractor
  - llava:13b           — vision analysis (photos of home issues)
  - nomic-embed-text    — embeddings for document chunks (768 dims)

Test each model after pulling:
  - qwen2.5:7b: "What maintenance should a new homeowner in North Texas
    do in their first spring?"
  - gemma3:4b: classify this text as one of [warranty, insurance, hoa,
    manual, receipt, other]: "This Limited Warranty covers defects in
    materials and workmanship..."
  - llava:13b: (test with a sample home photo if available)
  - nomic-embed-text: embed a sample sentence and print vector dims

Print response time for each test.

PART 2: Adaptive Model Router (Python module)

Create a ModelRouter class that decides which model handles each request.

ROUTING POLICY:

Use gemma3:4b (fast, small) for:
  - Document classification
  - Entity extraction from text
  - Metadata tagging
  - Simple yes/no questions
  - Checklist generation
  - Reminder text generation
  - Shopping list creation
  - Entity linking suggestions
  - Draft summaries (< 200 words)
  Expected latency: < 2 seconds

Use qwen2.5:7b (primary reasoning) for:
  - RAG-powered Q&A over documents
  - Warranty/insurance/HOA interpretation
  - Multi-step reasoning
  - Complex project planning
  - DIY guidance with safety considerations
  - Tool calling (schedule creation, cost estimation, etc.)
  - Tradeoff comparisons
  Expected latency: 3-10 seconds

Use llava:13b (vision) for:
  - Photo analysis (damage, fixtures, materials, plants)
  - Appliance/device identification from photos
  - Paint color matching
  - Before/after comparisons
  - Document photo OCR assist
  Expected latency: 5-15 seconds

Use Claude API (cloud fallback) for:
  - Multi-document reasoning (comparing warranty + insurance + HOA)
  - When local model confidence < 0.7
  - User explicitly requests "detailed analysis"
  - Complex vision with document context
  - Long document summarization (> 8K tokens input)
  RULES: Every cloud call MUST be:
    - Logged in ai_run with is_cloud_fallback=true
    - Logged in audit_event with action=cloud_api_call
    - User is shown indicator: "Using cloud AI for this answer"
    - Monthly cost tracked, alert at $30 and hard cap at $50

The router should:
  - Accept (query, attachments, context) as input
  - Classify the request intent first (using gemma3:4b)
  - Select model based on intent + complexity heuristics
  - Return (model_name, formatted_prompt, estimated_latency)
  - Log every routing decision in ai_run table

Create Modelfiles for two system personas:

homebase-reason (based on qwen2.5:7b):
  System prompt establishing it as a home expert for a Taylor Morrison
  Bordeaux in Celina, TX (North Texas, Zone 8a, expansive clay soil,
  hail season March-June). Knows the 1/2/10-year TM warranty tiers.
  Always checks warranty eligibility before suggesting outside repair.
  References HOA rules for exterior modifications. Temperature: 0.3.

homebase-see (based on llava:13b):
  System prompt for analyzing home photos. Assesses severity
  (cosmetic/moderate/urgent/emergency). Flags warranty-eligible items
  for homes < 1 year old. Identifies plants for Zone 8a.
  Suggests complementary paint colors. Recognizes AV equipment.
  Temperature: 0.2.
```

---

## Phase 1: Document Brain

### Prompt 1.1 — Document Ingestion Pipeline

```
Build the Document Brain service for HomeBase AI. This is a FastAPI
Python service that ingests, processes, and indexes home documents.

TECH STACK:
- FastAPI + uvicorn
- pypdf (text PDFs) + pytesseract + Pillow (scanned/image docs)
- Ollama Python client (embeddings + classification)
- asyncpg (PostgreSQL with pgvector)
- Supabase Storage Python client (file storage)
- structlog (logging)
- arq (background job dispatch to worker)

ENDPOINT: POST /api/v1/documents/upload
  Accepts: multipart file + metadata {title, doc_type (optional),
  home_id, room_id (optional), asset_id (optional)}

  Processing pipeline:
  1. STORE original file in Supabase Storage:
     bucket: documents/{property_id}/{doc_type}/{filename}
     Generate thumbnail (first page, 400px wide)

  2. EXTRACT text:
     - Text PDFs: pypdf
     - Scanned PDFs / images: pytesseract OCR
     - Threshold: if pypdf yields < 100 chars/page, fall back to OCR
     - Store raw extracted text in document.ocr_text_summary (truncated)

  3. CLASSIFY (if doc_type not provided):
     Send first 500 chars to gemma3:4b with prompt:
     "Classify this home document as exactly one of: warranty,
      insurance_policy, hoa_ccr, hoa_architectural, closing_deed,
      closing_settlement, inspection_report, manual, permit, receipt,
      invoice, contractor_quote, photo_scan, other.
      Respond with only the classification and confidence 0-1.
      Text: {first_500_chars}"
     Store classification + confidence in document table.

  4. EXTRACT STRUCTURED FIELDS (document-type-aware):

     Warranty docs:
       - Coverage items with start/end dates
       - Auto-create warranty records linked to assets/systems
       - Extract claim contact info

     Insurance policies:
       - Policy number, premium, deductible, coverage limits
       - Detect endorsements (water backup, foundation, equipment)
       - Auto-populate insurance_policy table
       - Tag chunks by section [declarations, coverage, exclusions,
         endorsements, conditions]

     HOA documents:
       - Extract rules and restrictions
       - Auto-create hoa_rule records with categories
       - Extract fee schedule, meeting info, approval processes

     Manuals:
       - Extract model numbers, link to asset records
       - Identify troubleshooting sections, parts lists
       - Tag with asset_id for filtered retrieval

     Closing documents:
       - Extract purchase price, loan amount, interest rate
       - Legal description, easements, survey data

     Receipts/invoices:
       - Extract vendor, amount, date, items
       - Link to asset or project if identifiable

  5. CHUNK:
     RecursiveCharacterTextSplitter: 800 chars, 200 overlap
     Each chunk gets metadata JSONB:
     {doc_type, page_number, section_header, property_id,
      linked_entity_type, linked_entity_id}

  6. EMBED:
     nomic-embed-text via Ollama → vector(768)
     Rate limit: max 10 concurrent embedding requests

  7. STORE chunks + embeddings in document_chunk table

  8. ENTITY-LINK:
     Use gemma3:4b to identify which home entities each document
     relates to. Create document_entity_link records.
     Prompt: "Given this document about '{title}' and these home
     entities: {list of assets, systems, rooms}, which entities
     does this document relate to? Return entity names and link types."

  9. AUDIT: log document_access event in audit_event table

ENDPOINT: POST /api/v1/documents/upload/batch
  Accepts: ZIP file with multiple documents
  Returns: SSE progress stream with per-file status

ENDPOINT: GET /api/v1/documents?property_id=X&doc_type=Y
  Paginated list with filters, includes thumbnail URLs

ENDPOINT: DELETE /api/v1/documents/{id}
  Soft-delete document, its chunks, entity links, and file

ENDPOINT: POST /api/v1/documents/{id}/reprocess
  Re-run extraction/chunking/embedding (for updated pipeline)

Include:
- Dockerfile
- Comprehensive error handling (corrupt PDFs, password-protected,
  oversized files, OCR failures)
- Rate limiting to prevent overwhelming Ollama
- Unit tests for classification, chunking, entity-linking logic
- Integration test with a sample warranty PDF
```

---

## Phase 2: Agent & Tool Layer (RAG + Vision + Tool Calling)

### Prompt 2.1 — Hybrid RAG Engine

```
Build the RAG query engine for HomeBase AI. This is the core intelligence
layer that answers homeowner questions using the home graph + documents.

ARCHITECTURE:

1. INTENT CLASSIFICATION (gemma3:4b, < 1 sec):
   Classify every incoming query into:
   - warranty_question → filter warranty docs, check coverage dates
   - insurance_question → filter policy docs, check coverage/exclusions
   - hoa_question → filter CC&Rs + architectural guidelines
   - maintenance_question → search manuals + maintenance history
   - diy_question → search manuals, use general knowledge
   - project_question → search project history + permits
   - asset_question → search asset registry + linked docs
   - garden_question → search plant records + zone data
   - theater_question → search theater devices + AV docs
   - financial_question → query costs, budgets, values
   - emergency → skip RAG, immediate safety instructions first
   - general_home → broad search + general knowledge

2. CONTEXT ASSEMBLY:
   Based on intent, build a context package:

   a. Retrieved document chunks (hybrid search):
      - Semantic: pgvector cosine similarity on query embedding
      - Keyword: PostgreSQL ts_vector full-text search
      - Combine with Reciprocal Rank Fusion (RRF)
      - Filter by doc_type based on intent classification
      - Boost chunks from entity-linked documents when query
        mentions a specific asset/room/system
      - Return top 5 chunks (max 3000 tokens)

   b. Home graph context (structured data from Postgres):
      - Property: address, builder, age, value
      - If room mentioned: room details + assets in that room
      - If asset mentioned: model, serial, warranty status, service history
      - Active warranties with days-until-expiry
      - Recent related maintenance tasks

   c. Temporal context:
      - Current date and season
      - Warranty expiry countdowns
      - Upcoming maintenance due dates
      - Insurance renewal countdown

   d. Conversation context:
      - Last 3 exchanges for continuity (from ai_run table)

3. GENERATION:
   Route to appropriate model via ModelRouter.
   Prompt structure:
   """
   You are HomeBase AI, an expert home assistant for a Taylor Morrison
   Bordeaux home at 809 Cottontail Way, Celina, TX (North Texas).
   The home closed March 25, 2026.

   HOME CONTEXT:
   {structured home graph data}

   RELEVANT DOCUMENTS:
   {retrieved chunks with source attribution}

   CONVERSATION HISTORY:
   {last 3 exchanges}

   USER QUESTION: {query}

   INSTRUCTIONS:
   - Answer based on the provided documents and home context
   - Cite specific documents with [Source: doc_title, page X]
   - If warranty-related: always state warranty status and expiry
   - If exterior modification: check HOA rules
   - If safety concern: lead with safety, then details
   - If unsure: say so, suggest what document might help
   - Suggest concrete next actions when appropriate
   """

4. TOOL CALLING (Ollama native tool calling with qwen2.5:7b):
   Available tools the model can invoke:
   - search_documents(query, doc_type_filter) → retrieve more chunks
   - get_warranty_status(asset_name) → warranty details + days left
   - get_insurance_coverage(event_type) → coverage + deductible
   - check_hoa_rules(topic) → relevant HOA restrictions
   - create_maintenance_task(title, description, priority, due_date)
   - create_alert(title, severity, suggested_actions)
   - get_asset_info(asset_name) → full asset details + service history
   - get_maintenance_schedule(timeframe) → upcoming tasks
   - estimate_cost(task_description) → rough cost range
   - create_shopping_list(items) → new shopping list
   - log_service_event(description, cost, vendor) → service log entry

   The model decides when to call tools. The agent loop:
   query → model thinks → calls tool(s) → gets results → continues
   thinking → calls more tools or generates final answer.
   Max 5 tool calls per query. Log all calls in ai_tool_call table.

5. POST-PROCESSING:
   - If warranty-related: append warranty status badge
   - If cost mentioned: offer to log expense
   - If task suggested: offer one-click task creation
   - If cloud fallback was used: show indicator
   - Save everything to ai_run + ai_tool_call tables
   - Update audit_event log

API ENDPOINTS:

POST /api/v1/ask
  {question, property_id, room_id?, asset_id?, image_url?}
  → {answer, sources[], confidence, model_used, is_cloud,
     suggested_actions[], tool_calls_made[]}

POST /api/v1/ask/stream
  Same input → SSE streaming response

GET /api/v1/conversations?property_id=X
  Paginated conversation history with search

Build with FastAPI. Include:
- Pydantic models for all request/response types
- Retry logic for Ollama (model loading can be slow first time)
- Graceful degradation if Ollama is down (return "AI unavailable")
- Token counting for cost tracking on cloud fallback
- Comprehensive logging with structlog
```

### Prompt 2.2 — Vision Copilot

```
Build the Vision Copilot for HomeBase AI. Handles all photo-based
interactions with the home graph.

ENDPOINT: POST /api/v1/vision/analyze
  Accepts: image file(s) + question + context {room_id, asset_id,
  analysis_mode}

ANALYSIS MODES:

1. damage_triage (default when question implies an issue):
   Prompt homebase-see model:
   "Analyze this photo from a 2025-built Taylor Morrison home in
    North Texas. Room: {room}. Question: {question}.
    Provide:
    1. What you observe (specific, factual)
    2. Severity: cosmetic / moderate / urgent / emergency
    3. Likely cause
    4. Warranty eligibility (home is {days} days old,
       workmanship warranty {active/expired},
       mechanical warranty {active/expired})
    5. Recommended action: DIY / call builder warranty / professional
    6. Cost estimate if professional repair needed
    7. Related home systems that should be checked"

   Post-processing:
   - If severity >= urgent: auto-create alert
   - If warranty eligible: pre-fill claim template in response
   - Search document brain for related warranty/manual info
   - Create entity links: photo → room → system → warranty

2. identify_item:
   "Identify this home item. Provide: type (fixture/appliance/
    material/hardware/plant/device), likely brand and model if visible,
    typical price range, where to buy replacements, and any
    maintenance notes."
   Post-processing:
   - Offer to add to asset registry
   - Search for matching manuals in document vault

3. garden_diagnosis:
   "Identify this plant and assess its health.
    Location: North Texas, USDA Zone 8a.
    Climate: hot summers (100°F+), mild winters, occasional freeze,
    alkaline clay soil, 36 inches annual rainfall.
    Provide: species ID, health assessment, diagnosis if unhealthy,
    care recommendations specific to North Texas, watering schedule
    for current season ({current_month}), companion planting suggestions."

4. paint_match:
   "Analyze the paint/finish in this photo. Provide: approximate color
    (name and hex code), likely finish type (flat/eggshell/satin/semi-
    gloss/gloss), complementary colors for adjacent surfaces,
    recommended paint brands available at Home Depot/Lowes in the
    DFW area. Note: if this is exterior paint, HOA approval may be
    required — flag for review."
   Post-processing:
   - Search HOA docs for paint restrictions
   - Offer to save to material_record

5. theater_device:
   "Identify this audio/video equipment. Provide: device type, likely
    brand/model, typical connections (HDMI/optical/RCA/speaker wire),
    common setup issues, and recommendations for optimal placement
    or calibration."
   Post-processing:
   - Offer to add to asset registry under theater room
   - Search for matching manuals

6. insurance_inventory:
   "Catalog this item for home insurance inventory. Provide: item
    description, category, estimated replacement value, condition
    assessment, and suggested documentation to keep."
   Post-processing:
   - Create or update asset record
   - Link to insurance policy
   - Store photo as evidence

7. compare_before_after:
   Accepts two images.
   "Compare these before and after photos. Describe: what changed,
    quality of work, any concerns, and whether the result matches
    typical professional standards."

8. document_ocr:
   "Extract all readable text from this document photo. Preserve
    structure (headings, tables, lists). Identify document type."
   Post-processing:
   - Feed extracted text into document ingestion pipeline
   - Classify and entity-link

CLOUD ESCALATION:
If local vision model returns low-confidence results or user requests
detailed analysis, escalate to Claude Vision with:
- The original image(s)
- Retrieved document context (warranty terms, HOA rules, manuals)
- Home graph context (room, asset, system details)
- Enhanced prompt combining vision + document intelligence
Log escalation in ai_run with is_cloud_fallback=true.

IMAGE STORAGE:
- Original: Supabase Storage, documents/{property_id}/photos/
- Thumbnail (400px): generated on upload
- EXIF preserved (date, GPS if available)
- Entity-linked: photo → room, asset, project, task, service_event

Include:
- All 8 analysis modes as separate prompt templates
- Pre-processing: resize, orientation fix, quality check
- "Image too blurry/dark — please retake" detection
- Multi-image support (up to 4 per request)
- Rate limiting (vision models are slow)
```

---

## Phase 3: Next.js Web Application

### Prompt 3.1 — App Foundation

```
Build the Next.js web application for HomeBase AI. This is the primary
interface for the family to interact with their home operating system.

TECH STACK:
- Next.js 14+ (App Router, Server Components where appropriate)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Supabase client SDK (@supabase/supabase-js) for auth + realtime
- TanStack Query for API data fetching
- Zustand for client state
- next-themes for dark mode

AUTH (Supabase GoTrue):
- Email/password login (no OAuth — private family app)
- Two accounts: owner_admin (Venkata) + household_member (partner)
- Admin creates accounts via settings page
- JWT stored in httpOnly cookies
- RLS policies enforce data access at the database level
- Middleware checks auth on all routes except /login

LAYOUT (mobile-first, responsive):
Collapsible sidebar navigation:
  🏠 Dashboard
  💬 Ask HomeBase (AI chat)
  📄 Documents
  🏗️ Home Profile (rooms, systems, assets)
  🔧 Maintenance
  📋 Projects
  🛡️ Coverage (insurance + warranties)
  🌿 Garden
  🎬 Theater
  📊 Finances
  📷 Photos
  🌡️ Smart Home
  ⚙️ Settings

DASHBOARD PAGE:
- Home summary card (address, age in days, estimated value)
- Warranty countdown bars:
  TM 1-Year Workmanship: [===========----] 247 days left
  TM 2-Year Mechanical:  [===============] 612 days left
  TM 10-Year Structural: [===============] 3,539 days left
- Upcoming tasks (next 14 days)
- Active alerts (from sensors, AI, schedule)
- Recent AI conversations (last 5)
- Quick actions: 📷 Photo Issue | 💬 Ask | ➕ Task | 📄 Upload
- Weather widget (Celina, TX — for seasonal maintenance context)
- Monthly spending summary
- Insurance renewal countdown (when < 90 days)

Generate full project scaffold with:
- All pages as stubs with proper layout wrappers
- Sidebar navigation component with active state
- Auth middleware and login page
- Supabase client configuration
- API client utility with typed endpoints + TanStack Query hooks
- Dark mode toggle (default: system preference)
- Loading states and error boundaries on all pages
- Dockerfile (multi-stage: build → production)
- Environment variable configuration (.env.local.example)
```

### Prompt 3.2 — AI Chat Interface

```
Build the "Ask HomeBase" chat page — the primary AI interaction surface.

CHAT INTERFACE:
- Message bubbles (user left-aligned gray, assistant right-aligned blue)
- Streaming responses via SSE (show tokens as they arrive)
- Markdown rendering in responses (headers, lists, bold, code blocks)
- Source citations as clickable chips below responses:
  [📄 TM Warranty Packet, p.12] [📄 HOA CC&Rs, p.34]
  Clicking opens the document viewer at that page
- Model indicator: "🏠 Local" or "☁️ Cloud" badge on each response
- Typing indicator with "Thinking..." and model name
- Tool call indicators: "🔧 Checking warranty status..."
  shown inline as the agent uses tools

PHOTO ATTACHMENT:
- Camera button opens device camera (mobile) or file picker (desktop)
- Drag-and-drop on desktop
- Image preview with crop/rotate before sending
- Up to 4 images per message
- After attachment, show analysis mode selector:
  [🔍 What's this?] [⚠️ Damage check] [🌿 Garden help]
  [🎨 Paint match] [🎬 Theater ID] [📋 Insurance item]

CONTEXT SELECTORS (above input field):
- Room dropdown: "In: [Kitchen ▼]" (pre-populated from rooms)
- Asset tag: "About: [Water heater ▼]" (filterable asset list)
- These add context to the query without user needing to type it

STARTER CHIPS (shown when chat is empty):
  "What maintenance is due this month?"
  "Is this covered under warranty?" (+ photo prompt)
  "What does my HOA say about fences?"
  "Help me plan a home improvement"
  "What's my insurance deductible?"
  "Identify this plant in my yard"

SUGGESTED ACTIONS (in assistant responses):
  Rendered as interactive buttons below the answer:
  [➕ Create Task] [📋 File Warranty Claim] [💾 Save to Projects]
  [🛒 Add to Shopping List] [📷 Take More Photos]
  Clicking executes via API with pre-filled data from the response

CONVERSATION MANAGEMENT:
- Left sidebar: conversation history (grouped by day)
- Search across all conversations
- Pin important conversations
- Delete conversations
- Each conversation auto-titled by AI from first message

FEEDBACK:
- 👍/👎 on each response → saved to ai_run.feedback
- "Flag as incorrect" → creates review item in settings

Style: Clean, minimal, warm. Not clinical.
Color palette: slate-700 backgrounds, blue-500 accents,
amber-400 for warnings, emerald-500 for healthy/good.
```

### Prompt 3.3 — Document Vault UI

```
Build the Document Vault page — visual manager for all home documents
with AI-powered search.

LAYOUT:
- Top: search bar (semantic search, not just filename)
- Below search: category filter tabs with counts:
  All (24) | Warranty (4) | Insurance (2) | HOA (3) | Closing (5) |
  Manuals (6) | Receipts (3) | Other (1)
- Toggle: Grid view (cards) / List view (table)
- Upload zone: drag-and-drop area, always visible at top

DOCUMENT CARD (grid view):
- Thumbnail (first page, auto-generated)
- Title (editable inline)
- Doc type badge (color-coded)
- Upload date
- AI-extracted key info shown as subtitle:
  Warranty: "Expires March 2027"
  Insurance: "Deductible: $2,500"
  HOA: "Fencing restricted to wood/wrought iron"
- Entity links shown as small tags: [Water Heater] [Plumbing System]
- Three-dot menu: view, download, reprocess, delete

UPLOAD FLOW:
1. Drag file(s) or click to browse (PDF, JPG, PNG, HEIC)
2. Upload progress bar per file
3. AI classifies document type → shown with "Is this right? [Yes] [Change]"
4. AI extracts key fields → shown for confirmation
5. AI suggests entity links → shown as checkboxes
6. User confirms → full ingestion pipeline runs
7. Toast: "✅ HOA CC&Rs processed — 34 chunks indexed, 8 rules extracted"

SEMANTIC SEARCH:
- Input: "What's my deductible for water damage?"
- Returns: matching chunks with highlighted relevant text
- Each result shows: document title, page number, relevance score,
  2-line snippet with highlight
- Click result → opens document viewer at that page
- "Ask AI about this" button → sends to chat with document context

DOCUMENT VIEWER (modal or side panel):
- In-browser PDF viewer (react-pdf or pdf.js)
- Page navigation
- Text selection → "Ask about this" popover
- Entity link sidebar (which assets/systems this doc relates to)
- Version history (if document was re-uploaded)

BATCH OPERATIONS:
- Select multiple → download ZIP
- Select multiple → "Compare these documents" (AI comparison)
- Select multiple → bulk re-categorize
- Select multiple → bulk entity-link
```

### Prompt 3.4 — Home Profile, Assets & Materials

```
Build the Home Profile section — the visual representation of the
home graph.

HOME PROFILE PAGE:
- Property card: address, photo (uploadable), key stats
  (sqft, lot, year built, builder, purchase price, current value)
- Interactive floor plan (or simple room grid):
  Clickable rooms, each showing asset count, last service date,
  any active alerts
- Systems overview: list of home systems with status indicators
- Edit mode for all fields

ROOM DETAIL PAGE:
- Room photo (uploadable)
- Assets in this room (card grid)
- Active maintenance tasks
- Recent service events
- Linked documents
- Sensor data (if HA integration active)
- "Ask about this room" button → chat with room context

ASSET REGISTRY (main list):
- Filterable/searchable table with:
  Photo | Name | Room | Brand/Model | Warranty Status | Last Service
- Quick filters: by room, by type, warranty status, needs attention
- Asset detail page:
  - Photo gallery
  - Full specs (brand, model, serial, dates)
  - Warranty status with countdown bar
  - Service history timeline
  - Linked documents (manual, receipt, warranty, invoices)
  - Maintenance schedule for this asset
  - Components and parts tracking
  - "Ask about this asset" → chat with full asset context
  - "Take photo for insurance" → vision pipeline → insurance inventory

MATERIAL & FINISH CATALOG:
- Room-by-room list of paint colors, flooring, countertops, tile, hardware
- Each entry: photo swatch, brand, color name, color code, finish type,
  where purchased, date
- "What paint is this?" → photo → AI match → save to catalog
- Useful for touch-ups, matching, and future renovations

THEATER ROOM PAGE (specialized view):
- Device inventory: TV/projector, receiver, speakers (with positions),
  streaming devices, gaming consoles, cables, acoustic treatment
- Connection diagram (text-based or simple visual)
- Calibration notes
- Troubleshooting: "Ask about theater setup" → AI with theater context
```

---

## Phase 4: Task & Maintenance Engine

### Prompt 4.1 — Maintenance System

```
Build the Task & Maintenance Engine for HomeBase AI.

MAINTENANCE CALENDAR:
- Monthly calendar view with task markers (color = priority)
- List view with filters: room, priority, status, type, season
- Agenda view: next 30 days, grouped by week
- Overdue tasks highlighted in red at top

TASK DETAIL PAGE:
- Title, description, priority, status, due date
- Linked entities: room, asset, system (with clickable links)
- Warranty awareness banner:
  If linked asset is under warranty:
  "⚠️ This HVAC unit is under Taylor Morrison's 2-year mechanical
   warranty until March 25, 2028. Contact TM warranty service at
   [phone] before hiring an outside contractor."
- DIY instructions (from linked manual or AI-generated)
- Estimated time and cost
- Vendor/contractor assignment
- Photo upload (before/during/after)
- Completion form: date, cost, notes, photos, vendor
- Completion creates a service_event record
- "Ask AI about this task" button

AUTO-GENERATED NORTH TEXAS SEASONAL SCHEDULE:
Seed the maintenance_schedule table with these templates:

SPRING (March-May):
  - HVAC tune-up and filter change [HVAC system, medium priority]
  - Test smoke and CO detectors [Safety, high priority]
  - Clean gutters post-pollen season [Exterior, medium]
  - Inspect roof for hail damage (March-June is hail season!) [Roof, high]
  - Service sprinkler system / check freeze damage [Irrigation, medium]
  - Power wash driveway and exterior [Exterior, low]
  - Check weatherstripping on doors/windows [Exterior, medium]
  - Inspect foundation for new cracks (expansive clay soil!) [Foundation, high]
  - Treat for fire ants and mosquitoes [Landscape, medium]
  - Mulch garden beds [Garden, low]

SUMMER (June-August):
  - Change HVAC filters MONTHLY (heavy AC) [HVAC, high]
  - Check attic ventilation and insulation [HVAC, medium]
  - Inspect and clean dryer vent [Appliance, medium]
  - Test garage door auto-reverse [Safety, medium]
  - Check caulking around windows and tubs [Interior, medium]
  - Water foundation perimeter consistently (CRITICAL for clay soil) [Foundation, high]
  - Deep water trees and shrubs early morning [Garden, medium]
  - Check pool/irrigation equipment [Irrigation, medium]

FALL (September-November):
  - HVAC tune-up (switch to heating mode) [HVAC, medium]
  - Clean gutters (leaves) [Exterior, medium]
  - Flush water heater [Plumbing, medium]
  - Winterize irrigation system [Irrigation, high]
  - Inspect and seal driveway cracks before freeze [Exterior, medium]
  - Check garage door weather seal [Exterior, low]
  - Inspect roof before winter [Roof, medium]
  - Overseed lawn (Bermuda → ryegrass if desired) [Garden, low]
  - Test all GFCI outlets [Electrical, medium]

WINTER (December-February):
  - Protect outdoor faucets (hose bib covers) [Plumbing, high]
  - Monitor pipe freeze risk — integrate with HA sensors [Plumbing, urgent when triggered]
  - Check attic for condensation [Interior, medium]
  - Inspect weather stripping [Exterior, medium]
  - Change HVAC filter [HVAC, medium]
  - Review insurance policy before spring storm season [Insurance, medium]
  - Service fireplace/gas logs if applicable [Interior, low]
  - Plan spring improvement projects [Projects, low]

WARRANTY-AWARE SCHEDULING:
- 60 days before TM 1-year workmanship expiry (Jan 2027):
  Auto-generate "Final Workmanship Walkthrough" task:
  ☐ Inspect all drywall for nail pops and cracks
  ☐ Check all doors and windows for proper operation
  ☐ Inspect grout and caulking in all bathrooms
  ☐ Check for any floor squeaks
  ☐ Document all cosmetic issues with photos
  ☐ Submit consolidated warranty request to Taylor Morrison
  Priority: HIGH

- 60 days before TM 2-year mechanical expiry (Jan 2028):
  Auto-generate "Final Mechanical Systems Review" task:
  ☐ Have HVAC professionally inspected — document any issues
  ☐ Check all plumbing fixtures for drips/leaks
  ☐ Test all electrical outlets and breakers
  ☐ Inspect water heater for any issues
  ☐ Document and submit all mechanical warranty claims
  Priority: HIGH

RECURRENCE ENGINE:
- RRULE-based (RFC 5545): FREQ=MONTHLY, FREQ=YEARLY, BYDAY, BYMONTH
- Auto-create next instance when current task is completed
- Skip logic: seasonal tasks hidden outside their season
- Snooze: defer a task by 7/14/30 days with reason

REMINDERS:
- Browser push notifications (PWA capability)
- Email notifications (SMTP or API-based)
- Dashboard alerts
- Configurable: notify at 7, 3, and 1 day(s) before due date
- Overdue escalation: daily reminder until completed or deferred

SHOPPING LIST INTEGRATION:
- When creating a maintenance task, AI can suggest materials needed
- "Generate shopping list" button on any task
- Links to relevant items with estimated costs
```

### Prompt 4.2 — Projects & Improvements

```
Build the Projects module for tracking renovations, improvements, and
DIY work.

PROJECT LIST PAGE:
- Card grid with status badges
- Filters: type, status, budget range
- "New Project" wizard (AI-assisted)

PROJECT DETAIL PAGE:
- Header: title, type, status, dates, budget vs actual
- HOA compliance banner (if exterior project):
  Auto-checks HOA rules. Shows:
  "🏘️ HOA Review Required: Fencing projects require architectural
   committee approval. Submit 30 days before planned start.
   Relevant rule: {rule text from hoa_rule table}
   [📝 Generate Approval Request]"

- Tabs:
  📋 Tasks — sortable task list with checkboxes, due dates, costs
  💰 Budget — line items with estimates vs actuals, running total
  📄 Documents — permits, quotes, invoices, receipts linked here
  📷 Photos — before/during/after gallery with dates
  🤖 AI Assistant — project-specific chat context
  📝 Journal — freeform notes/updates with timestamps

AI PROJECT PLANNER:
"Help me plan a project" flow:
1. User describes project (text or photo)
2. AI generates:
   - Scope definition
   - Step-by-step task breakdown
   - Material and tool list with estimated costs
   - Timeline estimate
   - DIY vs professional recommendation
   - Permit requirements for Celina, TX
   - HOA compliance check (auto-queries CC&Rs)
   - Safety warnings for electrical/structural/gas/roof work
   - Total budget estimate (range)
3. User can "Apply Plan" → creates project with tasks, budget lines,
   and shopping lists pre-populated

BUDGET TRACKER:
- Per-project: estimated vs actual by line item
- Cross-project: total home improvement spend
- Monthly trend chart
- Category breakdown (renovation, repair, landscaping, theater, etc.)
- ROI estimator: "This improvement may add ~$X to home value"
```

---

## Phase 5: Home Assistant Integration

### Prompt 5.1 — Smart Home Bridge

```
Build the Home Assistant integration for HomeBase AI. This connects the
smart home sensor network to the home operating system.

CONNECTION:
- Home Assistant REST API + WebSocket API
- Long-lived access token (stored in encrypted .env)
- Background worker polls + WebSocket for real-time events
- Retry logic with exponential backoff

DATA FLOWS:

1. SENSOR → ALERT PIPELINE:
   Monitor these and auto-create alerts in HomeBase:

   Water/leak sensors (Aqara):
     → URGENT alert
     → AI adds: "Check source, photograph damage, review warranty"
     → Cross-reference with plumbing system warranty status
     → If under TM mechanical warranty: include claim instructions

   Temperature sensors:
     → If < 32°F for > 4 hours in unheated areas:
       URGENT alert: "Pipe freeze risk detected in {room}"
       → AI adds specific pipe protection steps
     → If attic > 140°F: "Check attic ventilation"

   Humidity sensors:
     → If > 65% sustained > 24 hours:
       WARNING: "Elevated humidity in {room} — mold risk"
       → AI suggests dehumidifier, checking HVAC, vent inspection

   Door/window sensors:
     → Energy efficiency insights: "Front door was open for 2+ hours
        while HVAC was running"

   Power monitoring:
     → Abnormal consumption spike: "Power draw on {circuit} increased
        50% vs 30-day average — possible appliance issue"
     → Monthly energy report

2. CAMERA → AI ANALYSIS (on-demand, NOT continuous):
   Reolink cameras accessible via HA integration

   On-demand: User asks "Check the backyard camera"
     → Capture snapshot → send to vision pipeline
     → "I see your backyard looks dry — this is important for
        foundation maintenance on clay soil. Consider watering
        the foundation perimeter this week."

   Triggered: HA automation sends motion event
     → Worker captures snapshot → quick classification (person,
        delivery, animal, vehicle, weather event)
     → Only alert if unexpected or user has opted in

   Scheduled: Weekly snapshot of key areas
     → Trend comparison for gradual changes (foundation settling,
        landscape growth, exterior wear)

3. DEVICE INVENTORY SYNC:
   - Pull all HA entities, map to rooms/assets in HomeBase
   - Track device health: last_seen, battery_level
   - Link HA entities to maintenance tasks:
     entity sensor.smoke_detector_battery → task "Replace smoke
     detector batteries" when < 20%

4. SMART HOME DASHBOARD WIDGET:
   Embedded in HomeBase dashboard:
   - Room-by-room temperature and humidity
   - Active alerts from HA
   - Battery status of all wireless sensors
   - Camera quick-view (thumbnail snapshots)
   - Quick controls: lock doors, adjust thermostat, arm security

API ENDPOINTS:
  GET  /api/v1/smarthome/status — all monitored entities
  GET  /api/v1/smarthome/history/{entity_id}?hours=24
  POST /api/v1/smarthome/action — execute HA service call
  GET  /api/v1/smarthome/alerts — sensor-triggered alerts
  POST /api/v1/smarthome/camera/{camera_id}/analyze — snapshot + AI

SENSOR DATA STORAGE:
  Store in sensor_reading table. If volume becomes an issue,
  implement downsampling: keep 1-minute resolution for 7 days,
  5-minute for 30 days, hourly for 1 year.
```

---

## Phase 6: Insurance & Warranty Intelligence

### Prompt 6.1 — Coverage Intelligence

```
Build the Insurance & Warranty intelligence module.

WARRANTY TRACKER PAGE:
- Visual timeline (horizontal bars) showing all warranty periods:
  ━━━━━━━━━━━━━ TM 1-Yr Workmanship (Mar 2026 → Mar 2027) ██░░░
  ━━━━━━━━━━━━━ TM 2-Yr Mechanical  (Mar 2026 → Mar 2028) █████░
  ━━━━━━━━━━━━━ TM 10-Yr Structural (Mar 2026 → Mar 2036) ██████
  ━━━━━━━━━━━━━ Dishwasher Warranty (Apr 2026 → Apr 2028) █████░
  ... (one bar per warranty record)
- Each bar: click to expand with coverage details, linked docs, claims
- Countdown badges: "247 days until workmanship warranty expires"
- Expiration alert thresholds: 90 / 60 / 30 / 7 days

WARRANTY CLAIM WORKFLOW:
When user initiates a claim:
1. Describe issue (text + photo via vision pipeline)
2. AI identifies relevant warranty:
   - Which warranty applies?
   - Is the item still under coverage?
   - What's the claim process? (from ingested warranty docs)
3. AI generates claim documentation:
   - Description of issue
   - Date first noticed
   - Photos attached
   - Relevant warranty terms cited
   - Recommended contact method and info
4. Track claim: submitted → acknowledged → scheduled → resolved
5. Log as service_event when completed

INSURANCE DASHBOARD:
- Policy summary card (from auto-extracted insurance doc data)
- Coverage breakdown: dwelling, personal property, liability, medical
- Endorsements list with explanations
- Deductible amounts by event type
- "What's covered?" AI query (pre-filtered to insurance docs)
- Claim history log

JANUARY 2027 RENEWAL ENGINE:
(Timed workflow for Year 2 insurance shopping)

Auto-trigger: create a project + tasks in January 2027:

Project: "Year 2 Homeowners Insurance"
Status: planning
Budget: $2,400 - $2,800/year target

Tasks:
  ☐ Review current GEICO/Homesite policy limitations [Jan 1]
  ☐ Compile home details for quote requests [Jan 7]
     AI auto-generates: sqft, year built, roof type, security
     features, claim history, current coverage amounts
  ☐ Request quote: Amica [Jan 10]
  ☐ Request quote: Nationwide [Jan 10]
  ☐ Request quote: USAA [Jan 10]
  ☐ Request quote: Chubb [Jan 10]
  ☐ Request quote: TGS Insurance (independent broker) [Jan 10]
  ☐ Compare quotes — AI comparison analysis [Jan 25]
     Required coverage checklist:
       ☐ Foundation endorsement
       ☐ $25K water backup
       ☐ Service lines coverage
       ☐ Equipment breakdown
       ☐ Ordinance/law coverage
       ☐ Claim forgiveness
  ☐ Make decision [Feb 15 deadline]
  ☐ Bind new policy [Mar 10, 2027 deadline]
  ☐ Cancel old policy (if switching) [Mar 24]

CLAIM FILING ASSISTANT:
When user starts an insurance claim:
1. Describe event (text + photos)
2. AI checks: is this a warranty item first? (if under builder warranty)
3. AI checks: does insurance cover this event type?
4. AI compares deductible vs estimated repair cost
5. Generates documentation checklist
6. Drafts claim description with supporting details
7. Tracks claim lifecycle
```

---

## Phase 7: Family Workspace & Security

### Prompt 7.1 — Security, Audit & Provenance

```
Implement the security and audit layer for HomeBase AI.

SECURITY BASELINE:
- All containers on local Docker network only (no exposed ports)
- Caddy reverse proxy is the ONLY external-facing service
- Tailscale for remote access (mesh VPN, no port forwarding)
- Supabase RLS policies enforce data isolation per household
- All API endpoints require valid JWT
- File upload validation: type whitelist, max 50MB, ClamAV scan
- Rate limiting: 60 req/min for API, 10 req/min for AI endpoints
- Secrets in .env file, never browser-exposed, never in git

ENCRYPTION:
- Database volume: LUKS encryption at rest
- Supabase Storage: encrypted at rest
- Backup archives: age encryption (age-encryption.org)
- All inter-service communication over Docker network (not internet)

AUDIT TRAIL:
- audit_event table is APPEND-ONLY (no UPDATE, no DELETE — enforced
  by PostgreSQL trigger that rejects modifications)
- Every significant action logged:
  - User logins/logouts
  - Document uploads, views, and downloads
  - AI queries and responses (with model used)
  - Cloud API calls (flagged separately)
  - Data exports
  - Settings changes
  - Maintenance task completions
- Audit log viewer in Settings (admin only)
- Export audit log as CSV/JSON

AI PROVENANCE:
- Every AI-generated result includes:
  - Which model produced it (name + version)
  - Whether cloud fallback was used
  - Which document chunks were retrieved (with relevance scores)
  - Which tools were called
  - Confidence score
  - Timestamp and latency
- In the UI: subtle "🤖 AI-generated" badge on all AI content
- In the database: ai_run and ai_tool_call tables with full trace

CLOUD API CONTROLS:
- Claude API calls only happen when:
  1. Local model confidence < 0.7 (automatic)
  2. Query involves multi-document reasoning (automatic)
  3. User explicitly clicks "Get detailed analysis" (manual)
- Every cloud call:
  - Logged in audit_event with action=cloud_api_call
  - Shows "☁️ Cloud AI" indicator in UI
  - Counted toward monthly budget
  - Dashboard widget shows: "$14.32 / $50.00 cloud AI budget used"
- Hard cap: no cloud calls after $50/month (configurable)

ROLES:
- owner_admin: full access, manage users, view audit logs, settings
- household_member: full read, create tasks/projects, use AI, upload docs
  Cannot: delete documents, view audit logs, manage users, change settings
- guest_readonly: view-only access to selected data (future)
- contractor_portal: access only their assigned projects/tasks (future)
```

### Prompt 7.2 — PWA, Backup & Monitoring

```
PROGRESSIVE WEB APP:
- next-pwa configuration for installable mobile experience
- Service worker caches: app shell, recent AI conversations,
  maintenance schedule, asset list, warranty dates
- Web push notifications for alerts and reminders
- Camera access for photo capture on mobile
- "Add to Home Screen" prompt on first mobile visit
- Offline indicator bar with graceful degradation
- Background sync for photos taken while offline

BACKUP STRATEGY:
- Daily at 2:00 AM via cron:
  1. pg_dump --format=custom → /mnt/nas/backups/homebase/db/
  2. Supabase Storage rsync → /mnt/nas/backups/homebase/files/
  3. Config files (.env, docker-compose.yml, Caddyfile, Modelfiles)
     → /mnt/nas/backups/homebase/config/
  4. Encrypt all with age
  5. Verify: restore to temp container and run health checks
- Retention: 30 daily, 12 weekly, 12 monthly
- Ollama models excluded (re-pullable, large)
- Backup status reported on dashboard: "Last backup: 6 hours ago ✅"

MONITORING:
- Docker health checks on all services
- Disk space monitoring: alert at 80%, critical at 90%
- Ollama inference latency tracking (alert if > 30 seconds)
- Monthly cloud API cost report
- Service restart counts (alert if frequent)
- Simple status page in Settings: green/yellow/red per service
```

### Prompt 7.3 — First-Run Onboarding

```
Build the first-run onboarding wizard — shown once when the app is
first accessed after deployment.

STEP 1: WELCOME
  "Welcome to HomeBase AI — your home's operating system.
   Let's set up your home in about 10 minutes."

STEP 2: HOME PROFILE
  Pre-filled:
    Address: 809 Cottontail Way, Celina, TX 75009
    Builder: Taylor Morrison | Model: Bordeaux
    Closing date: March 25, 2026
  User fills: sqft, lot size, stories, home type
  Auto-set: timezone (America/Chicago), climate zone (8a)

STEP 3: ROOMS
  Interactive checklist with common rooms pre-checked:
  ☑ Entry/Mudroom  ☑ Living Room  ☑ Kitchen  ☑ Dining Room
  ☑ Primary Bedroom  ☑ Primary Bath  ☑ Bedroom 2  ☑ Bedroom 3
  ☑ Guest Bath  ☑ Office/Study  ☑ Laundry  ☑ Garage
  ☑ Theater Room  ☑ Pantry  ☑ Patio/Backyard  ☑ Front Yard
  ☐ Additional rooms: [+ Add room]
  Assign each to floor 1 or 2

STEP 4: DOCUMENTS
  "Upload your important home documents. We'll automatically
   organize and index them."
  Drag-and-drop zone with category hints:
  📋 Closing docs (deed, settlement statement)
  🛡️ Insurance policy
  🏗️ Builder warranty packet
  🏘️ HOA documents (CC&Rs, guidelines)
  📖 Appliance manuals
  Progress: "Processing 8 documents... 3/8 complete"
  AI classifies each, shows results for quick confirmation

STEP 5: KEY APPLIANCES
  "Let's catalog your major home systems and appliances."
  Pre-populated for new construction:
  ☑ HVAC System  ☑ Water Heater  ☑ Dishwasher  ☑ Range/Oven
  ☑ Microwave  ☑ Refrigerator  ☑ Washer  ☑ Dryer
  ☑ Garage Door Opener  ☑ Garbage Disposal
  For each: "Take a photo of the model plate — we'll extract details"
  Or: enter brand/model manually
  Auto-link to warranty docs if detected during ingestion

STEP 6: SMART HOME (optional)
  "Connect to Home Assistant for sensor monitoring"
  Enter: HA URL (e.g., http://homeassistant.local:8123)
  Enter: Long-lived access token
  [Test Connection]
  Auto-discover entities → map to rooms
  Select which sensors to monitor

STEP 7: TEST DRIVE
  "Your home is set up! Try asking HomeBase AI:"
  Pre-loaded questions (click to send):
    "When does my roof warranty expire?"
    "What are my HOA rules about fences?"
    "What's my insurance deductible?"
    "What maintenance should I do this spring?"
    "Create a move-in checklist for my new home"

  🏠 "HomeBase AI is ready! You have {X} documents indexed,
      {Y} assets tracked, and {Z} maintenance tasks scheduled."
```

---

## Build Sequence

### Full Build (16 weeks)

```
Week 1-2:   Prompt 0.1-0.3  — Schema, Docker stack, Ollama models
Week 3-4:   Prompt 1.1       — Document ingestion pipeline
Week 5-6:   Prompt 2.1       — RAG engine with hybrid search + tools
Week 7-8:   Prompt 3.1-3.2   — Next.js app + AI chat interface
Week 9:     Prompt 2.2       — Vision copilot (all 8 modes)
Week 10:    Prompt 3.3-3.4   — Document vault + Home profile UI
Week 11:    Prompt 4.1       — Maintenance engine + seasonal schedules
Week 12:    Prompt 4.2       — Projects and improvements tracker
Week 13:    Prompt 5.1       — Home Assistant integration
Week 14:    Prompt 6.1       — Insurance + warranty intelligence
Week 15:    Prompt 7.1-7.2   — Security, PWA, backup, monitoring
Week 16:    Prompt 7.3       — Onboarding + seed data + testing
```

### MVP Fast Path (5 weeks)

If you want a working system immediately:

```
Week 1:  Prompt 0.1-0.3 — Infrastructure + schema + models
Week 2:  Prompt 1.1     — Document ingestion (upload your 4 doc sets)
Week 3:  Prompt 2.1     — RAG engine (ask questions, get cited answers)
Week 4:  Prompt 3.1-3.2 — Web app + chat interface
Week 5:  Prompt 7.3     — Onboarding wizard + seed data

Result: Upload documents → ask questions → get AI answers with
source citations → from any browser on your network.
```

Then layer on vision, maintenance, HA integration, and insurance
intelligence one phase at a time.

---

## Day-One Questions This System Answers

After the MVP is live and your documents are ingested:

```
"Is this grout crack covered under warranty?"
"What does my HOA say about fences?"
"What's my insurance deductible for water damage?"
"When does my builder warranty expire?"
"What maintenance should I do this spring in North Texas?"
"Create a move-in checklist for my new home."
"Build me a 12-month maintenance schedule."
"Summarize all documents related to my water heater."
"What parts do I need to replace this fixture?" (+ photo)
"Is this plant healthy?" (+ photo of garden)
"What paint finish is this wall?" (+ photo)
"What equipment is in my theater room?"
"Compare this contractor invoice to the original estimate."
"What projects should I prioritize this quarter?"
"How much have I spent on home maintenance so far?"
```

---

*Every prompt above is self-contained and designed to be fed sequentially
to Claude Code, Cursor, or any AI coding assistant. Each phase builds on
the previous phase's output. The home graph entity-linking architecture
ensures that over time, every document, photo, task, and sensor reading
becomes more valuable as connections grow.*
