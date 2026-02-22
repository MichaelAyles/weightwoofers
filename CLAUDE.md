# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeightWoofers is an AI-powered pet food tracker. Users type natural language ("1 scoop of nood") and the system parses it via LLM, fuzzy-matches against known foods, tracks calories, and progressively learns food details through conversational follow-ups. Calorie budgets use NRC 2006 formulas (RER = 70 * BW^0.75).

The full specification is in `plan.md` — always consult it for detailed requirements, API contracts, database schema, and UX behavior.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 (Vite)
- **Backend**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **LLM**: OpenRouter API (`google/gemini-2.0-flash-001`)
- **Deployment**: Cloudflare Pages (frontend) + Workers (API)

## Monorepo Structure

```
apps/web/    — React frontend (Vite dev server)
apps/api/    — Cloudflare Worker backend (Hono, Wrangler)
```

npm workspaces manage the monorepo. Each app has its own package.json.

## Common Commands

```bash
# Frontend
npm run dev --workspace=apps/web        # Vite dev server
npm run build --workspace=apps/web      # Production build

# Backend
npm run dev --workspace=apps/api        # wrangler dev (local Workers)
npm run deploy --workspace=apps/api     # wrangler deploy

# Database (run from apps/api/ directory)
cd apps/api && npx wrangler d1 execute DB --local --file=src/db/schema.sql
cd apps/api && npx wrangler d1 execute DB --local --file=src/db/migration-002-admin.sql

# Type checking (API has no build script — use tsc directly)
npx tsc --noEmit -p apps/api/tsconfig.json
```

## Architecture

### Data Flow

```
User Input → Parser (LLM via OpenRouter) → Matcher (fuzzy against user's foods)
  → [matched + complete] → log entry + daily summary
  → [matched + incomplete] → log entry + clarification questions
  → [no match] → new food stub + progressive profiling
```

### Backend Services (`apps/api/src/services/`)

- **parser.ts** — Sends raw text to OpenRouter, returns structured ParsedInput (brand, variant, quantity, unit, confidence)
- **matcher.ts** — Fuzzy matches parsed input against user's known foods and aliases (bigram similarity, threshold 0.3)
- **profiler.ts** — Generates clarification questions in priority order (variant → serving weight → nutrition). Max 2 questions per logging event.
- **nutrition.ts** — NRC 2006 energy calculations (RER, MER with activity multipliers 1.2–2.0), kcal computation, completeness scoring
- **nutrition-lookup.ts** — LLM-based nutrition auto-population for new foods
- **openrouter.ts** — OpenRouter API client wrapper (default model: `google/gemini-2.0-flash-001`, temp 0.1)
- **auth.ts** — PBKDF2-SHA256 password hashing (100k iterations), session token generation

### API Routes (`apps/api/src/routes/`)

- **auth.ts** — `POST /api/auth/signup`, `/login`, `/logout`, `GET /api/auth/me` (cookie-based sessions, 30-day expiry)
- **log.ts** — `POST /api/log` — Main food logging (parse → match → log → summarize)
- **clarify.ts** — `POST /api/clarify` — Resolve pending clarifications, update food records
- **summary.ts** — `GET /api/summary/:pet_id` — Daily kcal breakdown (optional `?date=` param)
- **pets.ts** — CRUD: `GET/POST /api/pets`, `GET/PUT/DELETE /api/pets/:id`
- **foods.ts** — CRUD: `GET/POST /api/foods`, `GET/PUT /api/foods/:id`
- **admin.ts** — `/api/admin/*` — Full CRUD for users, API keys, pets, foods (admin-only)

### Middleware (`apps/api/src/middleware/`)

- **auth.ts** — Validates session cookie, sets `userId` in context. Applied to all `/api/*` except auth routes.
- **admin.ts** — Checks `is_admin = 1` on user, returns 403 if not admin. Applied to `/api/admin/*`.

### Database (7 tables in D1)

- **users** — Auth with email/password_hash, `is_admin` flag
- **sessions** — Session tokens with expiry
- **pets** — Profiles with NRC-calculated MER
- **foods** — Per-user food library with aliases (JSON array), nutrition data, completeness score
- **log_entries** — Daily intake with resolved weights and kcal
- **clarifications** — Pending follow-up questions with priority ordering
- **api_keys** — Admin-managed API keys (name, key_value, provider, is_active)

IDs use `lower(hex(randomblob(8)))` pattern. Completeness score is a weighted sum (serving_weight 30%, kcal 25%, variant 15%, macros 20%, other 10%).

Migrations: `schema.sql` (fresh install), `migration-002-admin.sql` (adds is_admin + api_keys table).

### Frontend Components (`apps/web/src/components/`)

- **LandingPage.tsx** — Public landing with logo, feature highlights, sign up / log in
- **AuthForm.tsx** — Login/signup form
- **Dashboard.tsx** — Main app: food input, clarifications, daily summary, food log
- **FoodInput.tsx** — Natural language text input for logging
- **ClarificationFlow.tsx** — Conversational follow-up questions
- **DailySummary.tsx** — Circular progress ring (kcal vs budget)
- **FoodLog.tsx** — Today's logged entries
- **PetsPage.tsx** — Pet management (list, create, edit, delete)
- **OnboardingWizard.tsx** — 3-step new pet setup (name → weight → activity)
- **PetForm.tsx** — Reusable pet form
- **AppHeader.tsx** — Top nav: pet selector, Manage Pets, Admin link (if admin), logout
- **AdminPage.tsx** — Tab-based admin panel (Users, API Keys, Pets, Foods)

### Frontend Hooks (`apps/web/src/hooks/`)

- **useLogFood.ts** — POST /api/log
- **useClarify.ts** — POST /api/clarify
- **useDailySummary.ts** — GET /api/summary/:petId
- **usePets.ts** — Pet CRUD
- **useActivePet.ts** — Active pet in localStorage
- **useAdmin.ts** — Admin CRUD (useAdminUsers, useAdminKeys, useAdminPets, useAdminFoods)

### Frontend Lib (`apps/web/src/lib/`)

- **api.ts** — Fetch wrapper with `credentials: 'include'` (get, post, put, del)
- **router.ts** — Hash-based routing (`useRouter()` hook)
- **types.ts** — Frontend type definitions mirroring backend

### Auth Context (`apps/web/src/contexts/AuthContext.tsx`)

- `useAuth()` — user state, login, signup, logout. Checks `/api/auth/me` on mount.

### Styling

- Tailwind CSS 4 with custom theme in `src/index.css`
- Design tokens: `--color-primary` (orange #f97316), surface, text, text-muted, border, success, warning, danger
- Logo at `apps/web/public/logo.jpg`

### Deployment

- **Frontend**: Cloudflare Pages with `functions/api/[[path]].ts` proxy → Workers API
- **Backend**: Cloudflare Workers at `weightwoofers-api.aylesm.workers.dev`, routed via `weightwoofers.mikeayles.com/api/*`
- **Wrangler config**: `apps/api/wrangler.toml` (D1 binding = `DB`)
- **Vite proxy**: `/api` → `http://localhost:8787` in dev

## Key Design Decisions

- **No embeddings/vector DB** — Per-user food corpus is tiny (~10-20 items); fuzzy matching + LLM parsing suffices
- **OpenRouter abstraction** — Enables model swapping (Gemini Flash → Claude Haiku) without code changes
- **Progressive profiling over forms** — Never show a form; learn incrementally through conversation
- **Aliases are user-generated** — "nood" confirmed as "Nood Adult Chicken" becomes a permanent alias
- **Cloudflare-native only** — D1, Workers, Pages. No external database dependencies
- **Cookie-based auth** — httpOnly secure cookies with 30-day sessions, SameSite=None for cross-origin
- **Admin panel** — Gated by `is_admin` flag, full CRUD for users/keys/pets/foods

## Environment Variables

`OPENROUTER_API_KEY` — Set via `wrangler secret put OPENROUTER_API_KEY` (never in wrangler.toml)
