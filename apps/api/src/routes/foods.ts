import { Hono } from 'hono';
import type { AppEnv, Food } from '../types';
import { calculateCompleteness } from '../services/nutrition';

const foods = new Hono<AppEnv>();

foods.get('/api/foods', async (c) => {
  const userId = c.get('userId');
  const result = await c.env.DB.prepare(
    'SELECT * FROM foods WHERE user_id = ? ORDER BY canonical_name'
  )
    .bind(userId)
    .all<Food>();
  return c.json(result.results);
});

foods.get('/api/foods/:id', async (c) => {
  const userId = c.get('userId');
  const food = await c.env.DB.prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .first<Food>();
  if (!food) return c.json({ error: 'Food not found' }, 404);
  return c.json(food);
});

foods.post('/api/foods', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<Partial<Food>>();
  const aliases = body.aliases ?? '[]';
  const completeness = calculateCompleteness(body as Food);

  const result = await c.env.DB.prepare(
    `INSERT INTO foods (user_id, canonical_name, brand, variant, aliases, serving_unit, serving_weight_g,
     kcal_per_100g, protein_pct, fat_pct, fibre_pct, moisture_pct, ash_pct, source, completeness_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      userId,
      body.canonical_name ?? 'Unknown Food',
      body.brand ?? null,
      body.variant ?? null,
      aliases,
      body.serving_unit ?? null,
      body.serving_weight_g ?? null,
      body.kcal_per_100g ?? null,
      body.protein_pct ?? null,
      body.fat_pct ?? null,
      body.fibre_pct ?? null,
      body.moisture_pct ?? null,
      body.ash_pct ?? null,
      body.source ?? 'manual',
      completeness
    )
    .first<Food>();

  return c.json(result, 201);
});

foods.put('/api/foods/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json<Partial<Food>>();

  const existing = await c.env.DB.prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<Food>();
  if (!existing) return c.json({ error: 'Food not found' }, 404);

  const merged = { ...existing, ...body };
  const completeness = calculateCompleteness(merged as Food);

  const result = await c.env.DB.prepare(
    `UPDATE foods SET canonical_name = ?, brand = ?, variant = ?, aliases = ?, serving_unit = ?,
     serving_weight_g = ?, kcal_per_100g = ?, protein_pct = ?, fat_pct = ?, fibre_pct = ?,
     moisture_pct = ?, ash_pct = ?, source = ?, completeness_score = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ? RETURNING *`
  )
    .bind(
      merged.canonical_name,
      merged.brand,
      merged.variant,
      merged.aliases,
      merged.serving_unit,
      merged.serving_weight_g,
      merged.kcal_per_100g,
      merged.protein_pct,
      merged.fat_pct,
      merged.fibre_pct,
      merged.moisture_pct,
      merged.ash_pct,
      merged.source,
      completeness,
      id,
      userId
    )
    .first<Food>();

  return c.json(result);
});

export default foods;
