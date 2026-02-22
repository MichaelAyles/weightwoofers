CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    breed TEXT,
    weight_kg REAL,
    birth_date TEXT,
    neutered INTEGER DEFAULT 1,
    activity_level TEXT DEFAULT 'normal',
    target_kcal_override REAL,
    calculated_mer REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    brand TEXT,
    variant TEXT,
    aliases TEXT,
    serving_unit TEXT,
    serving_weight_g REAL,
    kcal_per_100g REAL,
    protein_pct REAL,
    fat_pct REAL,
    fibre_pct REAL,
    moisture_pct REAL,
    ash_pct REAL,
    source TEXT,
    completeness_score REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS log_entries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    pet_id TEXT NOT NULL REFERENCES pets(id),
    food_id TEXT REFERENCES foods(id),
    raw_input TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    weight_g REAL,
    kcal REAL,
    logged_at TEXT DEFAULT (datetime('now')),
    meal_type TEXT
);

CREATE TABLE IF NOT EXISTS clarifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    user_id TEXT NOT NULL,
    log_entry_id TEXT REFERENCES log_entries(id),
    food_id TEXT REFERENCES foods(id),
    field TEXT NOT NULL,
    question TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    resolved INTEGER DEFAULT 0,
    resolved_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
