# HomeBase AI — v2.3 Final Tech Stack Amendment

*Tech stack confirmed: Next.js + React. Component ecosystem references
added to all UI prompts. Performance optimizations for old laptop.*

---

## Final Tech Stack Decision: Next.js + React

**Reason:** Access to the full React design component ecosystem
(21st.dev, Framer Motion, Aceternity UI, Magic UI, Dribbble-sourced
components) outweighs SvelteKit's performance advantage on constrained
hardware. The performance gap is manageable with optimizations.

### Confirmed Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | **Next.js 14+ (App Router)** |
| Language | **TypeScript (strict)** |
| Styling | **Tailwind CSS v4** |
| UI component base | **shadcn/ui** |
| Animation | **Framer Motion** |
| Design components | **21st.dev, Aceternity UI, Magic UI** as needed |
| Charts/data viz | **Tremor** or **Recharts** |
| Command palette | **cmdk** |
| Toasts | **Sonner** |
| Drawers/sheets | **Vaul** |
| Forms | **React Hook Form + Zod** |
| State management | **Zustand** (global) + **TanStack Query** (server) |
| Auth | **Supabase Auth** (@supabase/ssr for Next.js) |
| PWA | **@ducanh2912/next-pwa** (maintained fork) |
| Backend API | **FastAPI (Python)** |
| Database | **Self-hosted Supabase (Postgres + pgvector)** |
| LLM runtime | **Ollama** |
| Speech-to-text | **faster-whisper-server** |
| Job queue | **Redis + arq** |
| Reverse proxy | **Caddy** |
| CI/CD | **GitHub Actions (self-hosted runner)** |

### Next.js Optimizations for Old Laptop

Add these to the Next.js config and Docker setup:

```javascript
// next.config.ts
const config = {
  output: 'standalone',           // Minimal production bundle
  
  experimental: {
    optimizeCss: true,            // Smaller CSS bundles
  },
  
  images: {
    remotePatterns: [],           // Configure for Supabase Storage
    minimumCacheTTL: 86400,       // Cache optimized images 24 hours
  },
  
  // Reduce server memory usage
  serverExternalPackages: ['sharp'],
  
  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
};
```

```dockerfile
# Dockerfile optimizations for old laptop
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone output only needs these files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Low memory settings for old laptop
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Updated UI Prompts with Component References

### Amendment to Prompt 3.1 — App Foundation

Add to the dependencies and design system section:

```
COMPONENT ECOSYSTEM:

Base layer (install day one):
  npx shadcn@latest init
  - Button, Card, Dialog, Dropdown, Input, Label, Select,
    Table, Tabs, Badge, Alert, Avatar, Skeleton, Tooltip,
    Sheet, ScrollArea, Separator, Progress

Animation layer:
  npm install framer-motion
  - Use for: page transitions, list animations, micro-interactions,
    layout animations between views, gesture-based interactions
  - Wrap route changes in AnimatePresence for smooth transitions
  - Use motion.div for staggered card reveals on dashboard

Design accent components (add as needed from external sources):
  
  From 21st.dev:
  - Search for: dashboard cards, stat displays, file uploaders,
    chat interfaces, timeline components, notification cards
  - These drop in as React + TypeScript + Tailwind — copy directly
  - Customize colors to match HomeBase palette
  
  From Aceternity UI (aceternity.com/components):
  - Spotlight effect for the dashboard hero section
  - Animated tabs for document vault categories
  - Card hover effects for asset/room grid
  - Sparkles or meteors for the onboarding celebration step
  - Background beams for the login page
  - Floating navbar for mobile experience
  
  From Magic UI (magicui.design):
  - Animated counters for warranty countdown numbers
  - Shimmer borders for active alert cards
  - Blur fade for content loading transitions
  - Marquee for scrolling maintenance reminders (if desired)
  - Orbiting circles for the AI "thinking" indicator
  
  npm install cmdk
  - Global command palette (Cmd+K / Ctrl+K):
    Quick jump to any room, asset, document, or conversation
    Quick actions: "Create task", "Upload document", "Ask AI"
    Search across all entities in the home graph
  
  npm install sonner
  - Toast notifications for: task completed, document processed,
    alert triggered, backup complete, voice note transcribed
  
  npm install vaul
  - Bottom drawers on mobile for: quick task creation, photo
    capture with context, voice note recording

Data visualization:
  npm install tremor (or recharts)
  - Warranty timeline bars (horizontal stacked bar)
  - Monthly spending chart (bar chart)
  - Home value trend (line chart)
  - Maintenance task completion rate (donut/radial)
  - Utility cost breakdown (area chart)
  - Energy usage over time (line chart)
  - Budget vs actual per project (grouped bar)

DESIGN SYSTEM:

Color palette:
  --background: slate-50 (light) / slate-950 (dark)
  --foreground: slate-900 (light) / slate-50 (dark)
  --primary: blue-600          (main actions, links)
  --primary-light: blue-400    (hover states)
  --accent: amber-500          (warnings, warranty countdowns)
  --success: emerald-500       (completed, healthy, active)
  --danger: red-500            (urgent, overdue, emergency)
  --muted: slate-400           (secondary text, borders)
  
  Warranty status colors:
    Active (lots of time): emerald-500
    Expiring soon (< 90 days): amber-500
    Expired: red-500 / slate-400

Typography:
  Headings: Inter (or system font stack for performance)
  Body: Inter
  Monospace: JetBrains Mono (for model plate serial numbers, codes)

Border radius: rounded-xl (12px) for cards, rounded-lg (8px) for
buttons and inputs. Soft, modern feel.

Shadows: Use subtle shadows (shadow-sm) for cards on light mode.
On dark mode, use border separation instead of shadows.

The aesthetic should feel like a premium personal app — think Linear,
Raycast, or Arc browser. Clean, spacious, purposeful. Not a generic
Bootstrap admin panel.
```

### Amendment to Prompt 3.2 — AI Chat Interface

Add to the chat design section:

```
CHAT INTERFACE COMPONENT SOURCING:

The AI chat is the most-used page. It should feel premium.

Message bubbles:
  - Don't use basic divs — source or build a proper chat bubble
    component with: smooth appear animation (framer-motion),
    subtle background gradient for assistant messages,
    proper max-width handling for long messages
  - Assistant avatar: small HomeBase logo icon
  - User avatar: initials circle (from Supabase auth profile)

Streaming text:
  - Use a typewriter effect during SSE streaming
  - Cursor blink at the end of streaming text
  - Smooth scroll-to-bottom as tokens arrive

Source citations:
  - Render as small pill badges below the response:
    [📄 TM Warranty Packet, p.12]
  - On hover: framer-motion scale-up with preview snippet
  - On click: open document viewer at that page

Tool call indicators (shown inline during agent reasoning):
  "🔧 Checking warranty status..."
  "📋 Creating maintenance task..."
  - Use Aceternity's animated beam or shimmer effect during tool calls
  - Collapse to a small summary after completion:
    "✅ Warranty verified — 247 days remaining"

AI "thinking" indicator:
  - Use Magic UI's orbiting circles or a custom pulse animation
  - Show which model is being used: "homebase-reason (local)"

Photo attachment preview:
  - Grid layout for multiple images (2x2 max)
  - Framer Motion layout animation when images are added/removed
  - Blur-up loading effect for thumbnails

Suggested action buttons in responses:
  - Use shadcn Button variants (outline for secondary actions)
  - Subtle hover animation with framer-motion whileHover
  - Group related actions in a flex row

Empty state (no conversations yet):
  - Centered illustration or icon
  - Welcome message: "Hi Venkata! Ask me anything about your home."
  - Starter chips in a responsive grid with subtle hover effects
  
Command palette (cmdk):
  - Cmd+K opens global search overlay
  - Search entities: rooms, assets, documents, conversations, tasks
  - Quick actions: "Ask AI...", "Upload document", "Create task"
  - Recent items section
  - Keyboard navigation with highlighted selection
```

### Amendment to Prompt 3.3 — Document Vault UI

```
DOCUMENT VAULT DESIGN:

Upload zone:
  - Source a drag-and-drop uploader from 21st.dev or build with:
    react-dropzone + framer-motion for drop animation
  - File landing effect: card slides in with spring physics
  - Progress: animated progress bar per file (not just spinner)
  - Completion: confetti or subtle checkmark animation

Document grid:
  - Cards with thumbnail, hover to reveal actions
  - Framer Motion staggered children animation on page load
  - Layout animation when filtering categories (AnimatePresence)
  - Masonry or uniform grid (uniform is cleaner for documents)

Category tabs:
  - Use Aceternity animated tabs or shadcn Tabs with a sliding
    underline indicator (framer-motion layoutId)
  - Badge counts animate when documents are added/removed

Search experience:
  - cmdk-style inline search (expandable search bar)
  - Results appear as you type (debounced, 300ms)
  - Highlight matching text in results
  - Keyboard navigable
```

### Amendment to Prompt 3.4 — Home Profile & Assets

```
HOME PROFILE DESIGN:

Room grid:
  - Card per room with photo, asset count, status indicator
  - Hover: subtle lift effect (framer-motion whileHover y: -4)
  - Click: expand to room detail (shared layout animation)
  - Or: slide transition to room detail page

Asset registry:
  - Table view (default) with sortable columns
  - Card view toggle for visual browsing
  - Asset card: photo, name, brand, warranty status badge
    - Green glow border if under active warranty
    - Amber border if warranty expiring soon
    - No special border if expired
  - Inline edit for quick updates (click field to edit)

Warranty countdown bars:
  - Use Tremor's progress bar or custom component
  - Animated fill on page load (framer-motion)
  - Color transitions: emerald → amber → red as expiry approaches
  - Magic UI animated counter for days remaining

Material/finish catalog:
  - Color swatch grid (paint colors as circles or squares)
  - Click to expand: brand, product name, finish, where purchased
  - "Match this color" → opens camera for vision pipeline
```

### Amendment to Prompt 4.1 — Maintenance Dashboard

```
MAINTENANCE CALENDAR DESIGN:

Calendar view:
  - Use a React calendar component (react-big-calendar or
    custom with date-fns)
  - Task dots color-coded by priority
  - Click date → expandable day panel with task list
  - Drag to reschedule (if desired)

Task cards:
  - Clean card with: title, due date, priority badge, room tag,
    warranty status indicator
  - Swipe actions on mobile (complete, defer, skip)
  - Checkbox animation on completion (satisfying micro-interaction)
  - Staggered list animation (framer-motion)

Overdue section:
  - Red-tinted cards at top of list
  - Subtle pulse animation on the overdue count badge
  - "You have 3 overdue tasks" banner with quick-action buttons
```

---

## Complete Document Set

Your build plan now consists of these documents, applied in order:

```
1. homebase-ai-merged-build-plan-v2.md
   └── The full architecture, schema, and 15 sequential prompts

2. homebase-ai-v2.1-amendments.md
   └── 6 targeted fixes: cloud off, multi-property, safety engine,
       simpler first slice, config routing, offline-first

3. homebase-ai-v2.2-evaluation.md
   └── 12 missing features, deployment model (GitHub Actions),
       voice note ingestion, HA deferred, feature checklist

4. homebase-ai-v2.3-tech-stack-final.md (this document)
   └── Next.js confirmed, component ecosystem references,
       performance optimizations, design system, UI polish guidance
```

**To use:** Feed the prompts from v2 to Claude Code in sequence.
Before each UI prompt (3.x, 4.x), also include the corresponding
amendment from this v2.3 document for component and design guidance.

---

## Week Zero — Ready to Build

When you're ready, the first thing to do:

```
Day 1: Set up the GitHub repo with the folder structure from v2.2
       Docker Compose with: Postgres + pgvector, Ollama, Caddy
       Pull models: qwen2.5:7b + nomic-embed-text
       One FastAPI endpoint: POST /upload (PDF → chunks → embeddings)
       One FastAPI endpoint: POST /ask (question → vector search → answer)

Day 2: Single-page Next.js app with:
       - shadcn/ui card layout
       - File upload dropzone
       - Text input for questions  
       - Streaming response display with source citations
       Upload your Taylor Morrison warranty packet
       Ask: "Is grout cracking covered under warranty?"

Day 3: Upload remaining documents (insurance, HOA, closing)
       Test 10 real questions
       Validate: are the answers correct with proper citations?
       If yes → proceed to full build
       If no → debug retrieval before building more UI
```
