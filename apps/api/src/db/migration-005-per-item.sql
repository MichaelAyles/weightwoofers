-- Migration 005: Add per-item kcal for treats (dentasticks, etc.)

ALTER TABLE foods ADD COLUMN kcal_per_item REAL;
