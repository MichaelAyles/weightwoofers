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

# Database
npx wrangler d1 execute weightwoofers --local --file=apps/api/src/db/schema.sql

# Testing
npm test --workspace=apps/web
npm test --workspace=apps/api
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
- **matcher.ts** — Fuzzy matches parsed input against user's known foods and aliases
- **profiler.ts** — Generates clarification questions in priority order (variant → serving weight → nutrition). Max 2 questions per logging event.
- **nutrition.ts** — NRC 2006 energy calculations (RER, MER with activity multipliers) and kcal computation
- **openrouter.ts** — OpenRouter API client wrapper

### API Routes (`apps/api/src/routes/`)

- `POST /api/log` — Main food logging (parse → match → log → summarize)
- `POST /api/clarify` — Resolve pending clarifications, update food records
- `GET /api/summary/:pet_id` — Daily/weekly kcal breakdown
- CRUD: `/api/pets`, `/api/foods`

### Database (4 tables in D1)

- **pets** — Profiles with NRC-calculated MER
- **foods** — Per-user food library with aliases (JSON array), nutrition data, completeness score
- **log_entries** — Daily intake with resolved weights and kcal
- **clarifications** — Pending follow-up questions with priority ordering

IDs use `lower(hex(randomblob(8)))` pattern. Completeness score is a weighted sum (serving_weight 30%, kcal 25%, variant 15%, macros 20%, other 10%).

## Key Design Decisions

- **No embeddings/vector DB** — Per-user food corpus is tiny (~10-20 items); fuzzy matching + LLM parsing suffices
- **OpenRouter abstraction** — Enables model swapping (Gemini Flash → Claude Haiku) without code changes
- **Progressive profiling over forms** — Never show a form; learn incrementally through conversation
- **Aliases are user-generated** — "nood" confirmed as "Nood Adult Chicken" becomes a permanent alias
- **Cloudflare-native only** — D1, Workers, Pages, R2. No external database dependencies
- **Auth is deferred** — v1 uses hardcoded user_id or Cloudflare Access. Don't build auth scaffolding.
- **Single pet in UI** — Schema supports multi-pet, but UI shows one pet for v1

## Environment Variables

`OPENROUTER_API_KEY` — Set via `wrangler secret put OPENROUTER_API_KEY` (never in wrangler.toml)
