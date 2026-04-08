# HomeBase AI — v2.2 Evaluation & Amendments

*Feature audit, tech stack re-evaluation, deployment model revision,
and multi-modal ingestion (images, text, PDF, voice).*

---

## Part 1: Missing Features for a New Homeowner

After auditing comprehensive new-homeowner checklists against the v2.1
plan, these features are missing or underdeveloped:

### HIGH PRIORITY — Add to MVP or Phase 1-2

**1. Move-In Master Checklist**
Not just maintenance — the actual move-in process:
```
☐ Change/rekey all exterior door locks
☐ Locate and label main water shutoff valve
☐ Locate and label main gas shutoff valve
☐ Locate and label electrical panel — label every breaker
☐ Locate and photograph all clean-out access points
☐ Test all smoke detectors and CO detectors
☐ Test all GFCI outlets (kitchen, bath, garage, exterior)
☐ Test garage door auto-reverse safety
☐ Photograph every room (empty, pre-move-in condition — useful
   for warranty claims and insurance baseline)
☐ Record all meter readings (electric, gas, water) with photos
☐ Verify all appliances are operational
☐ Check all windows open/close/lock properly
☐ Run every faucet, flush every toilet, run every shower
☐ Check every light switch and outlet
☐ Walk the perimeter — photograph foundation, grading, drainage
☐ Walk the roof line from ground — photograph any visible issues
☐ Set up WiFi network and test coverage in all rooms
☐ Program garage door openers
☐ Set thermostat schedule
☐ Register all appliances for warranty (use serial numbers)
☐ File homestead exemption with Collin County (Texas specific!)
☐ Set up trash/recycling service
☐ Verify mailbox setup and USPS delivery
```
**Implementation:** Add as a `checklist_template` entity type that
auto-generates as a project on first login. Each item links to the
relevant room/system/asset when completed. Photos taken during
checklist attach to corresponding entities.

**2. Utility Account Tracker**
```
utility_account
  id, property_id, utility_type enum [electric, gas, water,
  sewer, trash, internet, cable, phone, security_monitoring,
  pest_control, lawn_care, pool, hoa_dues, other],
  provider_name, account_number, phone, website, login_email,
  monthly_cost_estimate, billing_cycle_day, auto_pay boolean,
  contract_end_date, notes
```
Dashboard widget: monthly utility cost summary.
Reminders for contract renewals.
**You already chose Tesla Electric — this should be tracked here.**

**3. Address Change Tracker**
Moving to a new home means updating your address in 20+ places:
```
☐ USPS mail forwarding
☐ Driver's license (Texas DPS — 30-day requirement)
☐ Vehicle registration
☐ Voter registration
☐ Banks and credit cards
☐ Investment accounts
☐ Insurance policies (auto, health, life)
☐ Employer/HR
☐ Amazon, subscriptions, online shopping
☐ Doctors, dentists, pharmacy
☐ Kids' schools (if applicable)
☐ Pet records / vet
☐ Streaming services with location-based content
☐ IRS (file Form 8822 or update on next return)
☐ Texas homestead exemption (Collin County Appraisal District)
```
**Implementation:** Another `checklist_template` that auto-generates
on move-in. Items can be checked off and dated.

**4. Emergency Preparedness (Critical for North Texas)**
```
emergency_info
  id, property_id, info_type enum [shutoff_location, shelter,
  emergency_contact, evacuation_route, kit_inventory, pet_plan],
  title, description, location_in_home, photo_url, notes

Seed data for North Texas:
- Tornado shelter location (interior room, lowest floor, no windows)
- Nearest public tornado shelter
- Storm kit inventory checklist (water, flashlight, radio, etc.)
- Freeze emergency: pipe protection steps, drip faucets list
- Hail response: move vehicles to garage, document damage after
- Power outage plan (especially with Tesla solar/Powerwall if future)
- Gas leak response: leave immediately, call 911 + Atmos Energy
- Water main break: shutoff valve location + photos
- Fire extinguisher locations and expiry dates
- Hospital: nearest ER address and drive time
- Poison control number
- Non-emergency police (Celina PD)
```
**Implementation:** Dedicated "Emergency" section accessible from
dashboard with one tap. Works fully offline (Amendment 6).

**5. Tax & Homestead Exemption**
```
☐ File homestead exemption with Collin County Appraisal District
  (deadline: April 30 of the year after purchase, so April 30, 2027)
  URL: https://www.collincad.org
☐ Track property tax payments (due January 31 annually)
☐ Save property tax statement as document
☐ Track mortgage escrow vs actual tax amount
☐ Note: homestead exemption reduces taxable value by $100K in Texas
```
**Implementation:** Add to maintenance schedule as a one-time task
with hard deadline. Store tax documents in Document Vault.

**6. EV Charging Management**
You have a Tesla Model Y. This matters for the house:
```
ev_charging
  id, property_id, charger_type enum [level1_outlet, level2_nema1450,
  level2_hardwired, tesla_wall_connector, other],
  location, circuit_breaker_number, amperage, estimated_kwh_per_month,
  install_date, installer, cost, permit_id, notes

Track:
- Which circuit/breaker powers the charger
- Monthly charging cost estimate (Tesla Electric rate)
- Whether the electrical panel has capacity for future upgrades
- Permit (if hardwired install was required)
```
**Implementation:** Asset record of type `ev_charger` linked to
the garage room and electrical system. Energy cost tracked in
utility_account.

### MEDIUM PRIORITY — Add in Phase 3-4

**7. Appliance Recall Monitoring**
Periodically check registered appliances against CPSC recall database.
- API: https://www.saferproducts.gov/RestWebServices (free, no key)
- Match by brand + model from asset registry
- Auto-create alert if recall found
- Implementation: weekly background worker job

**8. Cleaning Schedule**
```
Seed templates:
  Weekly: vacuum, mop hard floors, clean bathrooms, wipe kitchen
  Biweekly: dust all surfaces, clean mirrors, wash sheets
  Monthly: deep clean appliances, wash windows interior, organize
  Quarterly: deep clean HVAC vents, clean behind appliances
  Annually: professional carpet clean, window cleaning exterior
```
Implementation: maintenance_schedule entries with category "cleaning"

**9. Key & Lock Inventory**
```
key_record
  id, property_id, key_type enum [door, mailbox, garage, gate,
  storage, safe, other],
  location_description, copies_count, holder_names text[],
  is_smart_lock boolean, smart_lock_code, notes
```

**10. Guest House Manual**
"When someone visits, here's everything they need to know."
AI-generated from the home graph:
- WiFi password
- Thermostat instructions
- TV/theater remote guide
- Alarm code and instructions
- Emergency contacts
- Nearby restaurants and grocery
- Trash/recycling day
- Spare key location

Implementation: "Generate Guest Guide" button that queries the
home graph and produces a printable/shareable one-pager.

**11. Neighborhood & Community Info**
```
community_info
  id, property_id, info_type enum [hoa_contact, community_pool,
  community_gym, nearest_grocery, nearest_hardware,
  nearest_hospital, school_district, trash_day, recycling_day,
  mail_carrier_time, neighborhood_facebook, nextdoor_link,
  builders_office, management_company, gate_code],
  title, value, notes
```
Light Farms community specifics for your case.

**12. Network & Smart Home Documentation**
Since you have eero 6+, Reolink, Aqara, and Home Assistant:
```
Track:
- WiFi SSID and password (encrypted storage)
- eero network topology (which eero covers which rooms)
- Static IP assignments (HA, NVR, NAS, cameras)
- VLAN/IoT network segmentation notes
- Reolink NVR credentials and recording schedule
- HA admin URL and notes
- Smart device inventory (linked to asset registry)
```
Implementation: network_config table or JSONB on property_profile.

---

## Part 2: Tech Stack Re-Evaluation

### The Question: Next.js or SvelteKit?

**Your specific constraints:**
- Prod server: old laptop (limited CPU/RAM)
- Offline-first is a core requirement (Amendment 6)
- Private family app — no SEO needed
- Dev tool: Claude Code (knows both frameworks well)
- Self-hosted Docker deployment
- PWA with camera access for photo capture

**Benchmark data (2026):**

| Metric | SvelteKit | Next.js 16 |
|--------|-----------|------------|
| Initial JS bundle | 20-40 KB | ~70 KB |
| Server RPS (same hardware) | ~1,200 | ~850 |
| Time to Interactive | Faster | Slower |
| Build size (production) | Smaller | Larger |
| RAM usage (server) | Lower | Higher |
| PWA/offline support | Built-in | Plugin (next-pwa) |
| Self-hosted deployment | adapter-node (simple) | standalone mode |
| Component file size | Smaller (single-file) | Larger (JSX + hooks) |
| State management | Built-in stores/runes | External (Zustand etc.) |
| Form handling | Built-in, progressive | External (React Hook Form) |

### My Recommendation: SvelteKit

For THIS specific project, SvelteKit is the better technical fit.
Here's why:

1. **Old laptop as prod server** — SvelteKit handles 41% more
   requests per second on identical hardware and uses less RAM.
   When you're running Ollama, Postgres, and the web app on the
   same old machine, every MB matters.

2. **Offline-first is native** — SvelteKit has built-in service
   worker support and progressive enhancement. It works without
   JS by default and enhances when JS is available. Next.js needs
   the next-pwa plugin and more configuration.

3. **Smaller bundles = faster on local WiFi** — On your home
   network, this barely matters. But for the PWA installed on
   your phone accessing via Tailscale over mobile data, 20KB vs
   70KB initial load adds up.

4. **Simpler server deployment** — `adapter-node` produces a
   clean Node.js server. No special standalone config, no edge
   runtime confusion, no Vercel-specific optimizations to disable.

5. **Less boilerplate** — Svelte's single-file components with
   built-in reactivity (Runes in Svelte 5) mean less code to
   generate, less to maintain, fewer bugs. State management is
   built-in. Forms are built-in.

6. **Claude Code generates quality Svelte** — Claude's Svelte/
   SvelteKit knowledge is strong. The framework's simplicity
   actually makes AI-generated code more reliable because there
   are fewer footguns (no useEffect dependency arrays, no stale
   closures, no hook rules).

**What you lose vs Next.js:**
- Smaller component ecosystem (but shadcn-svelte exists)
- Fewer tutorials and Stack Overflow answers
- No React Server Components (not needed for this app)
- Slightly less mature image optimization (not critical here)

**Revised tech stack:**

| Layer | Previous (v2) | Revised |
|-------|---------------|---------|
| **Frontend** | Next.js 14 + React | **SvelteKit 2 + Svelte 5** |
| **UI library** | shadcn/ui | **shadcn-svelte** |
| **State management** | Zustand | **Svelte stores / runes** (built-in) |
| **Data fetching** | TanStack Query | **SvelteKit load functions** (built-in) |
| **Forms** | React Hook Form | **SvelteKit form actions** (built-in) |
| **Auth** | next-auth | **Supabase Auth JS client** (framework-agnostic) |
| **PWA** | next-pwa plugin | **@vite-pwa/sveltekit** (native) |
| Backend | FastAPI (Python) | FastAPI (Python) — **unchanged** |
| Database | Supabase + pgvector | Supabase + pgvector — **unchanged** |
| LLM runtime | Ollama | Ollama — **unchanged** |

**SvelteKit-specific notes for the prompts:**
- Use `adapter-node` for Docker deployment
- Use `+page.server.ts` for server-side data loading
- Use `+server.ts` for API proxy routes to FastAPI
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity
- Use `$lib` alias for shared components and utilities
- SSE streaming works natively with SvelteKit endpoints

### If You Prefer to Stick with Next.js

That's also fine. Next.js works. The ecosystem advantage is real.
If you're significantly more comfortable with React, the performance
difference won't break anything — it just means slightly higher
resource usage on the old laptop. The prompts in v2 are already
written for Next.js and will work as-is.

**The decision:** Pick whichever framework you'd be more productive
in. Both work. SvelteKit is technically better for your constraints;
Next.js has more community support.

---

## Part 3: Revised Deployment Model

### Old Setup (v2)
```
Dev laptop → (code) → Mini PC at home (runs everything)
```

### New Setup (v2.2)
```
Dev laptop              Old laptop (prod)         GitHub
(Claude Code)           (self-hosted runner)      (repo)
     │                        ▲                     │
     │  git push              │  GitHub Actions      │
     └───────────────────────►│◄─────────────────────┘
                              │
                              │  Runner pulls code,
                              │  builds Docker images,
                              │  deploys containers
                              │
                    ┌─────────┴──────────┐
                    │   Docker Compose    │
                    │                     │
                    │  • Supabase         │
                    │  • Ollama           │
                    │  • FastAPI          │
                    │  • SvelteKit        │
                    │  • Redis            │
                    │  • Caddy            │
                    │  • Whisper (STT)    │
                    └─────────────────────┘
                              │
                    Tailscale (remote access)
```

### Prompt: GitHub Actions Self-Hosted Runner + Deploy

```
Create the CI/CD pipeline for HomeBase AI.

SETUP:

1. GitHub repository structure:
   homebase-ai/
   ├── .github/
   │   └── workflows/
   │       ├── deploy.yml        (push to main → deploy)
   │       ├── test.yml          (push to any branch → run tests)
   │       └── backup.yml        (cron → daily backup)
   ├── services/
   │   ├── api/                  (FastAPI Python service)
   │   │   ├── Dockerfile
   │   │   ├── requirements.txt
   │   │   └── src/
   │   ├── web/                  (SvelteKit app)
   │   │   ├── Dockerfile
   │   │   ├── package.json
   │   │   └── src/
   │   └── worker/               (Background worker)
   │       ├── Dockerfile
   │       └── src/
   ├── docker-compose.yml
   ├── docker-compose.prod.yml   (production overrides)
   ├── Caddyfile
   ├── model-routing.yaml
   ├── Makefile
   ├── .env.example
   └── scripts/
       ├── setup-runner.sh       (install GitHub runner on old laptop)
       ├── setup-ollama.sh       (pull models)
       ├── backup.sh
       └── restore.sh

2. Old laptop setup script (setup-runner.sh):
   - Install Docker + Docker Compose
   - Install GitHub Actions self-hosted runner
     (follow: github.com/actions/runner)
   - Register runner with repo labels: [self-hosted, linux] or
     [self-hosted, windows] depending on OS
   - Install Ollama natively (not in Docker — better GPU access)
   - Pull models: qwen2.5:7b, gemma3:4b, llava:13b, nomic-embed-text
   - Create data directories: /data/postgres, /data/storage, /data/redis
   - Set up Tailscale for remote access
   - If Windows: install WSL2 + Ubuntu for Docker

   If the old laptop is Windows:
   - Install WSL2 with Ubuntu 24.04
   - Install Docker Desktop (uses WSL2 backend)
   - GitHub runner can run natively on Windows or inside WSL2
   - Ollama runs natively on Windows (better GPU access)
   - Recommend: run GitHub runner on Windows, Docker in WSL2,
     Ollama on Windows, expose Ollama to Docker via host network

   If the old laptop is Ubuntu:
   - Everything runs natively, simplest path
   - Recommend Ubuntu 22.04 or 24.04 LTS

3. GitHub Actions workflow (deploy.yml):

   name: Deploy to Home Server
   on:
     push:
       branches: [main]

   jobs:
     deploy:
       runs-on: self-hosted
       steps:
         - uses: actions/checkout@v4

         - name: Create .env from secrets
           run: |
             echo "SUPABASE_DB_PASSWORD=${{ secrets.DB_PASSWORD }}" > .env
             echo "SUPABASE_JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
             # ... all secrets from GitHub repo secrets

         - name: Build and deploy
           run: |
             docker compose -f docker-compose.yml \
               -f docker-compose.prod.yml \
               build --parallel
             docker compose -f docker-compose.yml \
               -f docker-compose.prod.yml \
               up -d --remove-orphans

         - name: Run migrations
           run: |
             docker compose exec api python -m alembic upgrade head

         - name: Health check
           run: |
             sleep 10
             curl -f http://localhost/api/v1/health || exit 1
             curl -f http://localhost/ || exit 1

         - name: Cleanup old images
           run: docker image prune -f

4. Secrets stored in GitHub repo settings (never in code):
   - DB_PASSWORD, JWT_SECRET, SUPABASE_ANON_KEY, etc.
   - CLAUDE_API_KEY (only if cloud fallback enabled)
   - HA_TOKEN (when Home Assistant is set up)
   - TAILSCALE_AUTH_KEY

5. Branch strategy:
   - main: production (auto-deploys on push)
   - dev: development (runs tests only)
   - feature/*: feature branches (runs tests only)
   - Claude Code works on feature branches, PR to dev, merge to main

6. Backup workflow (backup.yml):
   Runs on: schedule (cron: '0 2 * * *')  # 2 AM daily
   runs-on: self-hosted
   Steps: run backup script → verify → report status
```

---

## Part 4: Multi-Modal Knowledge Ingestion

### Supported Input Types (Day One)

The v2 plan covers PDFs and images. Here's the complete picture
including voice notes and plain text:

```
INPUT TYPE          → PROCESSING PIPELINE         → STORED AS
─────────────────────────────────────────────────────────────
PDF documents       → pypdf text extraction       → document +
                      (OCR fallback for scanned)     chunks +
                                                     embeddings

Images (JPG/PNG/    → Supabase Storage (original)  → photo entity
HEIC)                 + thumbnail generation          linked to
                      + EXIF extraction               room/asset
                    → Vision model for analysis
                    → If document photo: OCR → text → ingestion

Plain text          → Direct ingestion             → document +
(paste or type)       chunk + embed                   chunks +
                                                     embeddings

Voice notes         → Whisper STT (local)          → document
(recorded in-app      transcription                   (type: voice_note)
or uploaded audio)  → chunk + embed transcription   + audio file URL
                    → Optional: AI summary of       + transcription
                      transcribed content

Email forwarding    → (future) receive email       → document auto-
                      extract body + attachments     classified

Camera capture      → Same as image pipeline       → photo entity
(in-app)              but with room/context          with context
                      pre-selected
```

### Prompt: Voice Note Ingestion

```
Add voice note support to HomeBase AI. Users can record audio in the
app or upload audio files, and the system transcribes and indexes them
like any other document.

RECORDING UI (in SvelteKit web app):
- Microphone button in the chat interface (next to camera button)
- Also available on: document upload page, task detail page,
  project journal, and any "add notes" field
- Click to start recording → shows waveform + timer + stop button
- Uses MediaRecorder API (browser native, no library needed)
- Records as WebM/Opus (smallest file, best browser support)
- Max duration: 10 minutes (configurable)
- On stop: shows playback preview + "Transcribe & Save" button

TRANSCRIPTION SERVICE:
Add a Whisper container to the Docker stack:

Option A (recommended for old laptop — CPU inference):
  Use: ghcr.io/fedirz/faster-whisper-server:latest
  - Based on faster-whisper (CTranslate2 backend)
  - 4-6x faster than original Whisper on CPU
  - Model: whisper-small or whisper-base (for speed on old hardware)
  - Expose OpenAI-compatible API on internal port 8787
  - Approximate speed: 1 minute audio → 10-15 seconds to transcribe
    on modern CPU with whisper-small

Option B (if old laptop has NVIDIA GPU):
  Same container with --device gpu flag
  Use whisper-medium for better accuracy
  1 minute audio → 2-3 seconds to transcribe

Docker Compose addition:
  whisper:
    image: ghcr.io/fedirz/faster-whisper-server:latest
    ports:
      - "8787:8000"
    volumes:
      - /data/whisper:/root/.cache/huggingface
    environment:
      - WHISPER__MODEL=Systran/faster-whisper-small
      - WHISPER__DEVICE=cpu    # or 'cuda' for GPU
    networks:
      - homebase-net
    restart: unless-stopped

API ENDPOINT: POST /api/v1/ingest/voice
  Accepts: audio file (WebM, MP3, WAV, M4A, OGG) + metadata
  {property_id, title (optional), room_id, asset_id, linked_task_id}

  Pipeline:
  1. Store original audio in Supabase Storage:
     documents/{property_id}/voice/{timestamp}.webm
  2. Send to Whisper for transcription:
     POST http://whisper:8000/v1/audio/transcriptions
     (OpenAI-compatible API)
  3. Receive transcription text + timestamps
  4. Clean up transcription (light formatting via gemma3:4b):
     "Clean up this voice transcription. Fix obvious speech-to-text
      errors, add punctuation, and format into readable paragraphs.
      Do not change the meaning. Preserve all proper nouns and
      technical terms."
  5. Optionally: generate AI summary (gemma3:4b):
     "Summarize this voice note in 2-3 sentences for quick reference."
  6. Create document record:
     doc_type: 'voice_note'
     ocr_text_summary: AI summary
     Full transcription stored as document content
  7. Chunk + embed transcription (same as text documents)
  8. Entity-link based on content mentions
  9. If linked_task_id provided: attach to that task as a note

SEARCH & RETRIEVAL:
Voice note transcriptions are embedded and searchable like any document.
"What did I say about the water heater last week?" → retrieves the
relevant voice note, shows transcription, offers audio playback.

UI DISPLAY:
Voice notes show as cards with:
- Audio player (play/pause, scrubber, speed control)
- Transcription text (expandable)
- AI summary (if generated)
- Entity links (room, asset, task)
- Date and duration
- "Ask about this note" button → sends to AI chat with context

ACCESSIBILITY NOTE:
Voice notes are the fastest way to capture information when your
hands are busy (e.g., during a home inspection, while a contractor
is explaining something, or while walking through rooms). The app
should make voice capture as frictionless as possible — one tap
to start, one tap to stop, automatic processing.
```

### Prompt: Enhanced Image Ingestion

```
Expand the image ingestion to handle multiple input scenarios:

1. IN-APP CAMERA CAPTURE:
   - User opens camera from chat, task, or any entity page
   - Context is pre-filled: which room, which asset, which task
   - Captured photo auto-links to the active context
   - HEIC from iPhone auto-converted to JPEG

2. PHOTO UPLOAD (file picker):
   - Drag-and-drop or file browse
   - Batch upload (up to 20 images at once)
   - EXIF data extracted: date, GPS, camera info
   - If GPS available: auto-suggest room based on location

3. CLIPBOARD PASTE:
   - Paste screenshot directly into chat or upload area
   - Useful for pasting product photos, contractor quotes, etc.

4. DOCUMENT PHOTO (specialized mode):
   - User takes photo of a paper document
   - System detects it's a document (not a room/damage photo)
   - Runs OCR extraction
   - Feeds into document ingestion pipeline
   - Creates a proper document record, not just a photo

5. RECEIPT/LABEL SCANNING:
   - Dedicated "Scan receipt" and "Scan model plate" modes
   - Receipt: extracts vendor, date, items, total, payment method
   - Model plate: extracts brand, model, serial number
   - Auto-populates relevant fields in asset registry or
     service_event record

All images stored in Supabase Storage with originals preserved.
Thumbnails generated at 400px and 100px widths.
Every image gets entity-linked to relevant property entities.
```

---

## Part 5: Home Assistant — Deferred But Planned

Since you don't have Home Assistant yet, these changes apply:

1. **Phase 5 (HA integration) moves to Phase 6 or later**
   — Build the app without any HA dependency
   — All sensor-related features show "Connect Home Assistant
     to enable sensor monitoring" placeholder
   — The schema still includes sensor_reading and alert tables
     (they'll be ready when HA is connected)

2. **Manual alert creation replaces sensor alerts for now**
   — Users can manually create alerts: "Water leak in garage"
   — These use the same alert table and UI as future sensor alerts
   — When HA is eventually connected, automated alerts supplement
     manual ones

3. **The HA integration prompt (5.1) stays in the plan**
   — Execute it when you set up Home Assistant
   — The schema and API stubs are already in place
   — It should "just work" by adding the HA connection config

4. **Revised build sequence:**
```
Week 0:     Proof of Life (upload PDF, ask question, get answer)
Week 1-2:   Infrastructure (Supabase, schema, Ollama, Whisper)
Week 3:     Document ingestion (PDF, image, text, voice notes)
Week 4:     RAG engine + tool calling + safety engine
Week 5-6:   SvelteKit app + chat UI + document vault
Week 7:     Vision copilot (all modes)
Week 8:     Home profile + asset registry + materials catalog
Week 9:     Maintenance engine + move-in checklist + seasonal
Week 10:    Projects tracker + budget
Week 11:    Insurance, warranty, tax, utility tracking
Week 12:    Security, PWA, offline, backup, onboarding
Week 13+:   Home Assistant integration (when HA is ready)
```

---

## Part 6: Updated Feature Checklist

Master feature list with nothing missing. Check marks indicate
coverage in v2 + v2.1 + v2.2 amendments.

### Home Graph & Property Management
- [x] Property profile with climate/soil/risk data
- [x] Room and zone management
- [x] Home systems inventory (HVAC, plumbing, electrical, etc.)
- [x] Asset registry (appliances, fixtures, electronics, etc.)
- [x] Materials and finishes catalog (paint, flooring, tile, etc.)
- [x] Theater room device inventory
- [x] Garden plant registry with zone-aware care
- [v2.2] Utility account tracking
- [v2.2] Key and lock inventory
- [v2.2] Network and smart home documentation
- [v2.2] EV charging management
- [v2.2] Community and neighborhood info

### Document Intelligence
- [x] PDF ingestion with OCR fallback
- [x] Image/photo ingestion with EXIF extraction
- [x] Auto-classification by document type
- [x] Smart chunking per document type
- [x] Entity-linking (documents ↔ assets, systems, warranties)
- [x] Semantic + keyword hybrid search
- [x] Document viewer with "ask about this" feature
- [v2.2] Voice note recording and transcription
- [v2.2] Receipt and model plate scanning
- [v2.2] Clipboard paste for screenshots
- [v2.2] Document photo OCR mode

### AI Copilot
- [x] Adaptive model routing (config-driven)
- [x] RAG with source citations
- [x] Tool calling (search, create tasks, check warranties, etc.)
- [x] Vision analysis (8 specialized modes)
- [x] Safety policy engine
- [x] Conversation history with search
- [x] Cloud fallback (opt-in, off by default)
- [v2.2] Voice input for questions (record → transcribe → ask)

### Maintenance & Tasks
- [x] Seasonal maintenance templates (North Texas)
- [x] Recurring task engine (RRULE-based)
- [x] Warranty-aware scheduling
- [x] Pre-expiration inspection checklists
- [x] DIY instructions with safety classifications
- [x] Reminders (push, email, dashboard)
- [v2.2] Move-in master checklist
- [v2.2] Cleaning schedule templates
- [v2.2] Appliance recall monitoring (CPSC API)

### Projects & Improvements
- [x] Project tracker with budget vs actual
- [x] HOA compliance checker
- [x] AI project planner
- [x] Photo documentation (before/during/after)
- [x] Permit and contractor tracking
- [v2.2] Guest house manual generation

### Insurance, Warranty & Financial
- [x] Warranty timeline with countdowns
- [x] Warranty claim workflow
- [x] Insurance dashboard with coverage breakdown
- [x] January 2027 insurance renewal engine
- [x] Claim filing assistant
- [v2.2] Utility cost tracking
- [v2.2] Homestead exemption reminder
- [v2.2] Property tax payment tracking
- [v2.2] Address change checklist

### Emergency & Safety
- [x] Sensor-triggered alerts (when HA connected)
- [x] Safety policy engine on AI responses
- [v2.2] Emergency info page (shutoffs, shelter, contacts)
- [v2.2] Tornado preparedness for North Texas
- [v2.2] Manual alert creation

### Smart Home
- [x] Home Assistant integration (deferred until HA setup)
- [x] Sensor monitoring and alert pipeline
- [x] Camera snapshot analysis
- [x] Device inventory sync

### Family & Security
- [x] Role-based access (owner_admin, household_member)
- [x] Append-only audit trail
- [x] AI provenance ("AI did this" badges)
- [x] Encrypted backups to Synology NAS
- [x] Tailscale remote access
- [x] Offline-first with mutation queue
- [x] PWA with camera and microphone access
- [v2.2] GitHub Actions CI/CD deployment

---

## Summary of v2.2 Changes

| Change | What |
|--------|------|
| 12 missing features added | Move-in checklist, utilities, address change, emergency prep, tax/homestead, EV charging, recall monitoring, cleaning schedule, keys/locks, guest manual, community info, network docs |
| Tech stack: SvelteKit recommended | Lighter, faster, better offline support, simpler self-hosted deployment. Next.js remains valid alternative. |
| Deployment model revised | Claude Code → GitHub → self-hosted runner on old laptop → Docker Compose. No new hardware. |
| Voice note ingestion added | Whisper (faster-whisper-server) container for local STT. Record in browser → transcribe → chunk → embed → searchable. |
| Image ingestion expanded | Camera capture, batch upload, clipboard paste, document photo mode, receipt/label scanning. |
| HA deferred | Home Assistant integration moves to Phase 6+, app works fully without it. Manual alerts bridge the gap. |

**The plan is now complete. Start with Week Zero.**
