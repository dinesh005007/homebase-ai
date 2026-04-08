# HomeBase AI — v2.1 Amendment Patch

*Apply these six changes on top of the v2 merged build plan.
These are targeted edits, not a rewrite.*

---

## Amendment 1: Cloud Fallback Is Off by Default

**What changes:**

The system ships fully local. No Claude API key is required to run.
Cloud fallback becomes an opt-in feature toggled in Settings, not a
default behavior baked into the router.

**Replace the cloud fallback logic in Prompt 0.3 (Model Router) with:**

```
CLOUD FALLBACK POLICY:

Default state: DISABLED

Cloud inference is never called unless ALL of the following are true:
  1. The user has explicitly enabled cloud AI in Settings
  2. The user has entered a valid API key
  3. The user has set a monthly budget cap (default: $0)
  4. One of the following triggers fires:
     a. User clicks an explicit "Ask cloud AI" button on a response
     b. A pipeline is configured to allow cloud (admin toggle per feature)

There is NO automatic escalation. The local model always answers.
If the local model is uncertain, it says so — it does not silently
call the cloud.

UI behavior when cloud is disabled:
  - No "☁️ Cloud" badges anywhere
  - No "Get detailed analysis" button
  - AI responses never mention cloud capability
  - Settings page shows: "Cloud AI: Off — all processing is local"

UI behavior when cloud is enabled:
  - Settings shows: API key (masked), monthly budget, spend-to-date
  - Individual responses can be re-run with cloud via explicit button:
    [🔄 Re-analyze with cloud AI] — shown only after local response
  - Cloud responses are visually distinct and logged separately
  - Budget widget on dashboard: "$X.XX / $Y.00 used this month"
  - Hard stop at budget cap — no exceptions

In docker-compose and .env:
  CLOUD_AI_ENABLED=false         # default
  CLOUD_AI_PROVIDER=anthropic    # only used if enabled
  CLOUD_API_KEY=                 # blank by default
  CLOUD_MONTHLY_BUDGET_USD=0     # must be set explicitly

The entire app must be fully functional with CLOUD_AI_ENABLED=false.
No feature should degrade or show "upgrade to cloud" prompts.
This is a local-first system that happens to support cloud, not a
cloud system with a local cache.
```

---

## Amendment 2: Multi-Property Architecture

**What changes:**

Remove all hardcoded references to 809 Cottontail Way from the
schema, code, and system prompts. The Celina house becomes seed
data and a configuration profile, not an architectural assumption.

**Schema changes:**

The schema in Prompt 0.1 already supports multiple properties via
`property_id` foreign keys. No structural changes needed. But:

Add a `property_profile` table:

```
property_profile
  id, property_id,
  climate_zone text,              -- e.g., "8a"
  soil_type text,                 -- e.g., "expansive clay"
  hail_risk enum [low, moderate, high],
  freeze_risk enum [rare, occasional, frequent],
  hurricane_risk enum [none, low, moderate, high],
  wildfire_risk enum [none, low, moderate, high],
  builder_name text,
  builder_warranty_tiers JSONB,   -- [{type, start, end, description}]
  hoa_name text,
  hoa_managed boolean,
  regional_maintenance_notes text,
  metadata JSONB
```

**System prompt changes:**

Replace all hardcoded Taylor Morrison / Celina references in Modelfiles
with template variables populated at query time from the property profile:

```
SYSTEM PROMPT TEMPLATE (not a static Modelfile):

"You are HomeBase AI, an expert home assistant.

PROPERTY CONTEXT (injected per query):
  Address: {property.address}
  Builder: {property.builder} | Model: {property.builder_model}
  Age: {days_since_closing} days | Closed: {property.purchase_date}
  Climate zone: {profile.climate_zone}
  Soil: {profile.soil_type}
  Regional risks: {profile.hail_risk} hail, {profile.freeze_risk} freeze

ACTIVE WARRANTIES:
{for each warranty in property.warranties}
  {warranty.warranty_type}: {warranty.provider}
  Coverage: {warranty.coverage_description}
  Status: {active/expired} | Expires: {warranty.end_date}
  ({days_until_expiry} days remaining)
{end for}

INSTRUCTIONS:
  - Answer based on provided documents and home context
  - Check warranty eligibility before suggesting outside repair
  - Reference HOA rules for exterior modifications
  - Suggest maintenance appropriate for {profile.climate_zone}
  - Cite documents with [Source: title, page X]
  - If unsure, say so"
```

**Maintenance template changes:**

The North Texas seasonal templates in Prompt 4.1 become one of several
regional presets. On property creation, the onboarding wizard selects
the appropriate preset based on climate zone and soil type:

```
maintenance_preset
  id, name, region text, climate_zone text, soil_type text,
  schedules JSONB   -- array of maintenance_schedule seed data

Presets to ship with v1:
  - north_texas_clay (Zone 8a, expansive clay, hail risk)
  - general_temperate (fallback for unknown regions)

Users can customize after seeding. Additional presets can be
community-contributed later.
```

**Onboarding changes:**

Step 2 (Home Profile) in Prompt 7.3 becomes:
- Address entry (not pre-filled)
- Builder (optional, with common builders as suggestions)
- Climate zone auto-detected from ZIP code (hardcoded lookup table)
- Soil type suggested from region (user confirms)
- Maintenance preset auto-selected, user can customize

The Celina house data moves to a `seeds/celina-cottontail.json` file
that can be loaded with `make db-seed-demo` for development/testing.

---

## Amendment 3: Risk & Safety Policy Engine

**What changes:**

Add a formal safety layer that governs what the AI can and cannot
recommend. This is not a suggestion — it is a hard constraint on
every AI response that involves physical work on a home.

**Add to Prompt 2.1 (RAG Engine) — new section before Generation:**

```
RISK & SAFETY POLICY ENGINE:

Every AI response that suggests physical action on the home passes
through the safety policy engine AFTER generation, BEFORE delivery.

SAFETY CLASSIFICATION:
The engine classifies every suggested action into one of:

  SAFE — User can proceed (e.g., change HVAC filter, clean gutters,
  apply caulk, water plants, hang a picture, paint a wall)

  CAUTION — Provide guidance but add explicit warnings
  (e.g., using a ladder, minor plumbing like replacing a faucet,
  replacing a light fixture with power OFF, basic drywall patching)

  ESCALATE — Provide information but strongly recommend professional
  (e.g., electrical panel work, gas line anything, roof access,
  foundation concerns, HVAC refrigerant, load-bearing walls,
  tree removal near structures, mold remediation)

  REFUSE — Do not provide step-by-step instructions. Direct to
  licensed professional immediately.
  (e.g., electrical service entrance, gas leak response,
  structural modification, asbestos/lead abatement, sewer main,
  anything requiring a permit that the user hasn't obtained)

HARD RULES (non-negotiable, not configurable):
  1. NEVER provide step-by-step instructions for:
     - Electrical work beyond simple fixture/outlet replacement
     - Any gas line work (even minor)
     - Structural modifications to load-bearing elements
     - Roof work requiring walking on the roof
     - Work that requires a permit the user hasn't confirmed obtaining
  2. ALWAYS include in responses involving physical work:
     - "Turn off the relevant breaker/shutoff before starting"
       when electrical or plumbing
     - "Wear appropriate safety equipment" when applicable
     - "Check if a permit is required in your jurisdiction"
       when the scope warrants it
  3. ALWAYS flag when HOA approval may be needed (exterior work)
  4. ALWAYS note when work may void a warranty
  5. NEVER diagnose or dismiss potential:
     - Gas leaks ("If you smell gas, leave immediately, call 911
       and your gas company from outside")
     - Electrical hazards with exposed wiring
     - Structural failures (foundation, load-bearing)
     - Water intrusion into electrical systems
     - Mold in HVAC or extensive areas

CONFIGURABLE RULES (admin can adjust in Settings):
  - DIY confidence threshold: how comfortable is the user with
    hands-on work? [beginner / intermediate / experienced]
    Adjusts whether CAUTION items get full instructions or
    "consider hiring a professional" guidance
  - Permit awareness: Celina, TX permit requirements (configurable
    per jurisdiction, loaded from a reference table)
  - Builder warranty reminder: always/never/only-when-active

IMPLEMENTATION:
Create a SafetyPolicy class that:
  1. Accepts the generated response + suggested actions
  2. Scans for action keywords and categories
  3. Classifies risk level per action
  4. Injects appropriate warnings, disclaimers, or blocks
  5. Logs safety classifications in ai_run metadata
  6. Returns modified response with safety annotations

The safety engine is NOT an LLM call. It is a rule-based classifier
using keyword matching + category lookup. It runs in < 50ms and
adds zero inference cost. The LLM generates the answer; the safety
engine gates what ships to the user.

SAFETY POLICY TABLE:
  safety_rule
    id, category enum [electrical, gas, plumbing, structural,
    roofing, hvac, foundation, chemical, ladder, permit, hoa,
    warranty_void, general],
    keyword_patterns text[],     -- regex patterns that trigger this rule
    risk_level enum [safe, caution, escalate, refuse],
    warning_text text,           -- injected into response
    override_allowed boolean,    -- can admin downgrade this rule?
    is_active boolean
```

---

## Amendment 4: Simpler First Implementation Slice

**What changes:**

The current MVP fast path (5 weeks) is still too broad. Add a
"Week Zero" slice that gets a working system in 2-3 days.

**Add to the Build Sequence section:**

```
WEEK ZERO — Proof of Life (2-3 days):

Goal: Upload a PDF, ask a question about it, get a cited answer
in a browser. Nothing else.

Day 1:
  - Docker Compose with: Postgres + pgvector, Ollama, Caddy
  - No Supabase yet — plain Postgres with a single-user hardcoded token
  - Pull: qwen2.5:7b + nomic-embed-text
  - Single FastAPI endpoint: POST /upload (accepts PDF, extracts text,
    chunks, embeds, stores in pgvector)
  - Single FastAPI endpoint: POST /ask (accepts question, does vector
    search, assembles prompt, calls Ollama, returns answer + sources)

Day 2:
  - Single-page Next.js app with:
    - File upload dropzone
    - Text input for questions
    - Response display with source citations
  - No auth, no sidebar, no database schema beyond documents +
    chunks tables
  - Upload your Taylor Morrison warranty packet
  - Ask: "Is grout cracking covered under warranty?"
  - Verify: correct answer with page citation

Day 3:
  - Upload remaining 3 document sets (insurance, HOA, closing)
  - Test 10 real questions
  - Fix chunking/retrieval issues found during testing
  - Decide: is the RAG quality good enough to build on?

This slice validates the CORE HYPOTHESIS: can local Ollama + pgvector
give useful, cited answers about your home documents?

If yes → proceed to full MVP (Weeks 1-5)
If no  → debug retrieval quality before building any UI

Only after Week Zero succeeds do you invest in Supabase, auth,
the full schema, multiple model routing, or any UI beyond basics.
```

**Revised full sequence becomes:**

```
Week 0:     Proof of Life — upload PDF, ask question, get answer
Week 1-2:   Full infrastructure (Supabase, schema, Ollama models)
Week 3:     Document ingestion pipeline (all doc types)
Week 4:     RAG engine with tool calling + safety engine
Week 5-6:   Next.js app + chat UI + document vault
Week 7:     Vision copilot
Week 8:     Maintenance engine + seasonal schedules
Week 9:     Projects tracker
Week 10:    Home Assistant integration
Week 11:    Insurance + warranty intelligence
Week 12:    Security, PWA, backup, onboarding
```

---

## Amendment 5: Config-Driven Model Routing

**What changes:**

The ModelRouter in Prompt 0.3 should read all routing decisions from
a configuration file, not hardcoded if/else logic. Models, thresholds,
and routing rules are all swappable without code changes.

**Replace the hardcoded routing in Prompt 0.3 with:**

```
MODEL ROUTING CONFIGURATION:

All routing is driven by a YAML config file (model-routing.yaml)
that is loaded at startup and hot-reloadable via API call.

# model-routing.yaml

models:
  fast:
    provider: ollama
    model: gemma3:4b
    max_context_tokens: 8192
    temperature: 0.2
    description: "Fast classifier, tagger, extractor"
    
  reason:
    provider: ollama
    model: qwen2.5:7b
    max_context_tokens: 8192
    temperature: 0.3
    supports_tool_calling: true
    description: "Primary reasoning and RAG model"
    
  vision:
    provider: ollama
    model: llava:13b
    max_context_tokens: 4096
    temperature: 0.2
    supports_images: true
    description: "Photo analysis and visual Q&A"
    
  embed:
    provider: ollama
    model: nomic-embed-text
    dimensions: 768
    description: "Document and query embeddings"

  cloud:                          # only active if cloud enabled
    provider: anthropic
    model: claude-sonnet-4-20250514
    max_context_tokens: 200000
    temperature: 0.3
    supports_images: true
    supports_tool_calling: true
    enabled: false                # off by default (Amendment 1)
    description: "Cloud fallback for complex tasks"

routing_rules:
  # Each rule: intent → model role → optional conditions
  - intent: classify
    model: fast
    
  - intent: tag
    model: fast
    
  - intent: extract_metadata
    model: fast
    
  - intent: generate_checklist
    model: fast
    
  - intent: generate_reminder
    model: fast
    
  - intent: entity_link
    model: fast
    
  - intent: rag_query
    model: reason
    
  - intent: warranty_interpretation
    model: reason
    
  - intent: insurance_interpretation
    model: reason
    
  - intent: hoa_interpretation
    model: reason
    
  - intent: project_planning
    model: reason
    
  - intent: diy_guidance
    model: reason
    
  - intent: tool_calling
    model: reason
    
  - intent: vision_analyze
    model: vision
    
  - intent: vision_identify
    model: vision
    
  - intent: vision_garden
    model: vision
    
  - intent: vision_paint
    model: vision
    
  - intent: document_ocr
    model: vision
    
  - intent: cloud_rerun       # explicit user action only
    model: cloud
    condition: cloud_enabled

# Thresholds (all configurable)
thresholds:
  intent_classification_model: fast
  low_confidence_threshold: 0.4  # below this, ask user to rephrase
  max_tool_calls_per_query: 5
  max_retries_on_failure: 2
  embedding_batch_size: 10
  vision_max_image_size_px: 1024

# Fallback chain (if primary model fails/times out)
fallback:
  fast: reason        # if fast model fails, try reason model
  reason: null        # if reason fails, return error (no silent cloud)
  vision: null        # if vision fails, return error
  cloud: null         # cloud has no fallback

The ModelRouter class:
  1. Loads model-routing.yaml at startup
  2. Exposes reload() method (callable via admin API endpoint)
  3. For each request: classify intent → look up routing rule → select model
  4. If model is unavailable (Ollama not running, model not pulled):
     try fallback chain, then return graceful error
  5. Log every routing decision: {intent, model_selected, latency}
  6. Never auto-escalate to cloud — cloud is only via explicit rule

Admin UI in Settings:
  - View current routing config
  - Change model assignments per intent (dropdown of available models)
  - Adjust thresholds
  - Pull new models from Ollama
  - View routing analytics: queries by model, avg latency, failure rate
  - Hot-reload config without restart

This means when better local models drop (Gemma 4, Llama 4, etc.),
you update one YAML file and reload — no code changes anywhere.
```

---

## Amendment 6: Offline-First as Core Architecture

**What changes:**

Offline capability is not a Phase 7 PWA afterthought. It is a core
design constraint from Phase 0. The app must be useful when:
- The mini PC is on but has no internet
- The user is on their phone on local WiFi with no WAN
- Ollama is running but slow/overloaded

**Add to Prompt 3.1 (Next.js Foundation) — new section:**

```
OFFLINE-FIRST DESIGN PRINCIPLES:

1. DATA LAYER:
   The Next.js app maintains a local cache (IndexedDB via Dexie.js
   or idb-keyval) that mirrors critical data:

   Always cached (synced on every load):
     - Property profile
     - Room list with asset counts
     - Asset registry (name, brand, model, warranty status)
     - Active warranty list with expiry dates
     - Maintenance tasks (next 90 days)
     - Active alerts
     - Insurance policy summary
     - HOA rules summary
     - Recent 20 AI conversations

   Cached on first access (refreshed on revisit):
     - Document metadata list (not full PDFs)
     - Project list and status
     - Vendor list
     - Plant registry
     - Material/finish catalog

   Never cached (always server-fetched):
     - Full document content and PDFs
     - Sensor readings and camera feeds
     - Audit logs
     - Full conversation history beyond recent 20

2. OFFLINE UI BEHAVIOR:
   When the API server is unreachable:
   - Show subtle banner: "Offline — showing cached data"
   - All cached data remains browsable and searchable
   - Maintenance calendar renders from cached tasks
   - Warranty countdowns calculate from cached dates + local clock
   - Asset details viewable from cache
   - AI chat shows: "AI is offline — reconnect to ask questions"
     But shows cached conversations for reference
   - Task completion queues locally, syncs when reconnected
   - Photo capture queues locally, uploads when reconnected

3. MUTATION QUEUE:
   When offline, user actions queue in IndexedDB:
   - Complete a maintenance task
   - Add a note to a project
   - Create a new task
   - Take and annotate a photo

   On reconnection:
   - Queue replays in order
   - Conflicts resolved by last-write-wins with user notification
   - Sync status indicator: "3 changes pending sync"

4. SERVICE WORKER STRATEGY:
   - App shell: cache-first (instant load)
   - API data: stale-while-revalidate (show cache, update in background)
   - AI endpoints: network-only (no point caching AI responses)
   - Documents/photos: cache-on-demand (cached after first view)

5. IMPLICATIONS FOR OTHER PHASES:
   - Phase 2 (RAG): API returns graceful "offline" error, not a crash
   - Phase 4 (Maintenance): task due dates calculated client-side
     from cached schedule data, not server-computed
   - Phase 5 (HA): sensor dashboard shows "last known" values with
     timestamp when HA connection is down
   - Phase 6 (Insurance): warranty countdowns are pure client-side
     date math on cached warranty records

The app should feel like a native app that happens to have a
server, not a web app that breaks without one.
```

---

## Summary of All v2.1 Changes

| # | Amendment | What Changed |
|---|-----------|-------------|
| 1 | Cloud off by default | Cloud fallback disabled by default. Opt-in via Settings. No silent escalation. Entire app works with `CLOUD_AI_ENABLED=false`. |
| 2 | Multi-property | Property-specific config in `property_profile` table. System prompts templated from property data. Maintenance presets by climate zone. Celina data becomes seed file. |
| 3 | Safety engine | Rule-based safety classifier on every DIY/action response. SAFE/CAUTION/ESCALATE/REFUSE levels. Hard rules for electrical, gas, structural. Non-negotiable, runs in < 50ms. |
| 4 | Simpler first slice | "Week Zero" added: 2-3 day proof-of-life with plain Postgres, single FastAPI endpoint, minimal UI. Validates RAG quality before investing in full stack. |
| 5 | Config-driven routing | `model-routing.yaml` drives all model selection. Intent → model mapping, thresholds, fallback chains all configurable. Hot-reloadable. No hardcoded model names in code. |
| 6 | Offline-first core | IndexedDB cache layer from day one. Mutation queue for offline actions. Service worker strategies per data type. Warranty countdowns and maintenance calendar work without server. |

**Apply these six amendments to the v2 merged build plan.
Then start building from Week Zero.**
