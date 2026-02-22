# Weight Woofers (fatdog.log) - Claude Code Project Prompt

## What This Is

An AI-powered pet food tracker with natural language input, progressive profiling, and NRC-based calorie budgeting. The user types things like "1 scoop of nood" and the system learns their shorthand, resolves ambiguity through conversational follow-ups, and tracks daily intake against a scientifically-defensible calorie budget.

Think MyFitnessPal but for dogs, with an LLM handling the input parsing instead of a search-and-select dropdown.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (if needed for images later)
- **LLM**: OpenRouter API (use `google/gemini-2.0-flash-001` for input parsing, cheap and fast)
- **Deployment**: Cloudflare Pages (frontend) + Workers (API)
- **Monorepo**: Single repo, `apps/web` and `apps/api` structure

## Project Structure

```
weight-woofers/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── FoodInput.tsx        # Main input bar (chat-style)
│   │   │   │   ├── ClarificationFlow.tsx # Follow-up questions UI
│   │   │   │   ├── DailySummary.tsx      # Kcal budget + macro ring
│   │   │   │   ├── FoodLog.tsx           # Today's entries
│   │   │   │   ├── PetProfile.tsx        # Pet setup/edit
│   │   │   │   └── OnboardingWizard.tsx  # First-run pet setup
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── App.tsx
│   │   └── package.json
│   └── api/                    # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts                 # Hono app entry
│       │   ├── routes/
│       │   │   ├── log.ts               # POST /api/log - main food logging
│       │   │   ├── pets.ts              # CRUD pet profiles
│       │   │   ├── foods.ts             # Known foods library
│       │   │   ├── clarify.ts           # Handle follow-up answers
│       │   │   └── summary.ts           # Daily/weekly summaries
│       │   ├── services/
│       │   │   ├── parser.ts            # LLM input parsing
│       │   │   ├── matcher.ts           # Fuzzy food matching
│       │   │   ├── profiler.ts          # Progressive profiling logic
│       │   │   ├── nutrition.ts         # Nutrition lookup + NRC calcs
│       │   │   └── openrouter.ts        # OpenRouter API client
│       │   └── db/
│       │       └── schema.sql           # D1 schema
│       ├── wrangler.toml
│       └── package.json
├── package.json
└── CLAUDE.md
```

## Database Schema (D1)

```sql
-- Pet profiles
CREATE TABLE pets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    breed TEXT,
    weight_kg REAL,
    birth_date TEXT,              -- ISO date
    neutered INTEGER DEFAULT 1,   -- boolean
    activity_level TEXT DEFAULT 'normal',  -- low, normal, moderate, high
    target_kcal_override REAL,    -- vet-prescribed override
    calculated_mer REAL,          -- auto-calculated from NRC formula
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Known foods library (learned per user)
CREATE TABLE foods (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,  -- "Nood Adult Chicken"
    brand TEXT,                    -- "Nood"
    variant TEXT,                  -- "Adult Chicken"
    aliases TEXT,                  -- JSON array: ["nood", "nood chicken", "the chicken one"]
    serving_unit TEXT,             -- "scoop", "cup", "pouch"
    serving_weight_g REAL,        -- grams per serving_unit
    kcal_per_100g REAL,
    protein_pct REAL,
    fat_pct REAL,
    fibre_pct REAL,
    moisture_pct REAL,
    ash_pct REAL,
    source TEXT,                   -- "manual", "allaboutdogfood", "label", "llm_lookup"
    completeness_score REAL,       -- 0.0 to 1.0, auto-calculated
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Daily food log entries
CREATE TABLE log_entries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    pet_id TEXT NOT NULL REFERENCES pets(id),
    food_id TEXT REFERENCES foods(id),
    raw_input TEXT NOT NULL,       -- original user text: "1 scoop of nood"
    quantity REAL,
    unit TEXT,
    weight_g REAL,                -- resolved weight in grams
    kcal REAL,                    -- calculated calories for this entry
    logged_at TEXT DEFAULT (datetime('now')),
    meal_type TEXT                 -- "breakfast", "dinner", "treat", "snack" (optional)
);

-- Pending clarifications
CREATE TABLE clarifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    log_entry_id TEXT REFERENCES log_entries(id),
    food_id TEXT REFERENCES foods(id),
    field TEXT NOT NULL,           -- which field needs filling: "variant", "serving_weight_g", "kcal_per_100g"
    question TEXT NOT NULL,        -- the question to ask the user
    priority INTEGER DEFAULT 0,   -- lower = ask first
    resolved INTEGER DEFAULT 0,
    resolved_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

## Core Logic

### 1. Input Parsing (parser.ts)

Send the raw input to OpenRouter with a structured extraction prompt. The LLM should return:

```typescript
interface ParsedInput {
    brand_guess: string | null;
    variant_guess: string | null;
    quantity: number;
    unit: string;           // "scoop", "cup", "handful", "pouch", "g", "kg"
    weight_g: number | null;
    meal_type: string | null;
    confidence: number;     // 0-1
}
```

**OpenRouter call pattern:**
```typescript
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
            {
                role: "system",
                content: `You are a pet food input parser. Extract structured data from natural language food logging.
                
Known foods for this user: ${JSON.stringify(knownFoods)}

Return ONLY valid JSON matching this schema:
{
    "brand_guess": string | null,
    "variant_guess": string | null, 
    "quantity": number,
    "unit": string,
    "weight_g": number | null,
    "meal_type": string | null,
    "confidence": number
}

If the input is ambiguous, set confidence low. If a known food alias matches, set confidence high.`
            },
            { role: "user", content: rawInput }
        ],
        temperature: 0.1,
        max_tokens: 200,
    })
});
```

### 2. Fuzzy Matching (matcher.ts)

After parsing, match against the user's known foods:
- Check aliases array (JSON) for substring/fuzzy matches
- Use the LLM's brand_guess against foods.brand
- If exactly one match with high confidence: auto-resolve
- If multiple matches: generate clarification asking which one
- If no match: this is a new food, start progressive profiling

### 3. Progressive Profiling (profiler.ts)

When a food record is incomplete, generate clarification questions in priority order:

1. **Variant disambiguation** (priority 0): "Is that Nood Adult Chicken or Nood Puppy Lamb?"
2. **Serving weight** (priority 1): "Can you weigh one scoop? We need this once to track calories accurately."
3. **Nutrition data** (priority 2): attempt automatic lookup first. If that fails: "What are the kcal/100g on the packet? (Check the guaranteed analysis on the back)"

Rules:
- Maximum 2 questions per logging event
- Never ask about nutrition if you can look it up automatically
- Once a field is filled, never ask again
- Update completeness_score after each resolved clarification

**Completeness score calculation:**
```typescript
function calculateCompleteness(food: Food): number {
    const fields = [
        { key: 'variant', weight: 0.15 },
        { key: 'serving_weight_g', weight: 0.30 },
        { key: 'kcal_per_100g', weight: 0.25 },
        { key: 'protein_pct', weight: 0.10 },
        { key: 'fat_pct', weight: 0.10 },
        { key: 'fibre_pct', weight: 0.05 },
        { key: 'moisture_pct', weight: 0.05 },
    ];
    return fields.reduce((score, f) => 
        score + (food[f.key] != null ? f.weight : 0), 0
    );
}
```

### 4. NRC Energy Calculations (nutrition.ts)

Use NRC 2006 formulas. These are the industry standard used by AAFCO and FEDIAF.

```typescript
// Resting Energy Requirement
function calculateRER(weightKg: number): number {
    return 70 * Math.pow(weightKg, 0.75);
}

// Maintenance Energy Requirement
const ACTIVITY_MULTIPLIERS = {
    low: 1.2,         // senior, very sedentary, weight loss
    normal: 1.4,      // neutered adult, light activity (DEFAULT FOR CORGIS)
    moderate: 1.6,    // neutered adult, regular exercise
    high: 1.8,        // intact adult or very active
    very_high: 2.0,   // working dogs, puppies 4-12mo
} as const;

function calculateMER(weightKg: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number {
    const rer = calculateRER(weightKg);
    return rer * ACTIVITY_MULTIPLIERS[activityLevel];
}

// Calories from a food entry
function calculateEntryKcal(weightG: number, kcalPer100g: number): number {
    return (weightG / 100) * kcalPer100g;
}
```

### 5. Nutrition Lookup

When a new food is added and nutrition fields are empty, attempt automatic lookup:

1. Call OpenRouter with web search context: "What is the guaranteed analysis for [brand] [variant] dog food? Return kcal/100g, protein %, fat %, fibre %, moisture %"
2. If the LLM returns confident values with a source, store them with source = "llm_lookup"
3. If not confident, create a clarification asking the user to check the packet

## API Routes

### POST /api/log
Main endpoint. Accepts `{ raw_input: string, pet_id: string }`.

Flow:
1. Parse input via LLM
2. Match against known foods
3. If matched + complete: log entry, return daily summary
4. If matched + incomplete: log entry (partial), return clarification questions
5. If no match: create new food stub, return clarification questions
6. Always return current daily kcal total and budget

Response shape:
```typescript
interface LogResponse {
    entry: LogEntry;
    clarifications: Clarification[];  // empty if none needed
    daily_summary: {
        total_kcal: number;
        budget_kcal: number;
        remaining_kcal: number;
        entries_today: LogEntry[];
        percentage: number;
    };
}
```

### POST /api/clarify
Accepts `{ clarification_id: string, value: string }`.
Resolves a pending clarification, updates the food record, recalculates any affected log entries.

### GET /api/summary/:pet_id?date=YYYY-MM-DD
Returns daily summary with kcal breakdown per entry, macro split, and budget status.

### CRUD routes for /api/pets and /api/foods

## Frontend UX

### Main Screen
- Single text input at top (like a chat/command bar)
- Daily calorie ring/progress bar below
- Scrollable food log for today
- Each entry shows: time, description, kcal, and a % of daily budget

### Clarification Flow
- When the API returns clarifications, show them inline below the input as chat-like bubbles
- Quick-reply buttons where possible ("Nood Adult Chicken" | "Nood Puppy Lamb")
- Free text input for things like weight

### Onboarding
- Pet name, breed (autocomplete), weight, neutered Y/N, activity level
- Auto-calculate and display MER: "Based on NRC guidelines, [name]'s daily budget is ~X kcal"
- Option to override with vet-prescribed number

## Environment Variables

```toml
# wrangler.toml
[vars]
OPENROUTER_API_KEY = "" # Set via wrangler secret
```

## Key Design Decisions

1. **No vector DB / no embeddings** - The per-user food corpus is tiny (10-20 items). Fuzzy matching + LLM parsing is simpler and better.
2. **OpenRouter over direct API** - Model flexibility. Start with Gemini Flash for cost, swap to Claude Haiku if quality needs improve. Single integration point.
3. **Progressive profiling over forms** - Never show a form. Learn incrementally through conversation.
4. **Aliases are user-generated shorthand** - When someone types "nood" and confirms it means "Nood Adult Chicken", store "nood" as an alias. Next time it auto-resolves.
5. **Completeness score drives UX** - Only ask questions when a food is incomplete. Once complete, logging is instant.
6. **NRC 2006 as the scientific basis** - Cite it everywhere. RER = 70 * BW^0.75 is the standard. Activity multipliers from NRC Table 15-3.
7. **Cloudflare-native** - D1 for structured data, Workers for compute, Pages for frontend. No external DB dependencies.
8. **Treats count** - Treats are foods with their own nutrition profiles. "1 dentastix" should work the same as "1 scoop of kibble".

## What NOT To Build (Yet)

- Multi-pet switching UI (support in schema, single pet in UI for now)
- Photo/barcode scanning
- Historical weight tracking charts
- Vet sharing/export
- Social features
- Mobile app (PWA is fine for v1)

## Auth

For v1, use a simple Cloudflare Access or even just a hardcoded user_id. This is a personal tool first. Don't waste time on auth scaffolding.

## Testing the Parser

Good test inputs to verify the LLM parsing works:
- "1 scoop of nood" → should match or create Nood, quantity 1, unit scoop
- "half a pouch of butchers" → quantity 0.5, unit pouch, brand Butcher's
- "2 dentastix" → quantity 2, unit piece, brand Dentastix
- "handful of training treats" → quantity 1, unit handful, generic treat
- "his breakfast" → should ask what he had (no food info)
- "same as yesterday" → should look up yesterday's entries (stretch goal)