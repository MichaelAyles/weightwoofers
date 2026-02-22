-- Migration 003: Add model column to api_keys
ALTER TABLE api_keys ADD COLUMN model TEXT DEFAULT 'google/gemini-3-flash-preview';
