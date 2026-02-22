-- Migration 002: Admin panel support
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'openrouter',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
