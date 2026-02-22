import { Hono } from 'hono';
import type { Pet, CreatePetRequest, ActivityLevel } from '../types';
import { calculateMER } from '../services/nutrition';

type Bindings = { DB: D1Database; OPENROUTER_API_KEY: string };

const pets = new Hono<{ Bindings: Bindings }>();

const USER_ID = 'default_user';

pets.get('/api/pets', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(USER_ID)
    .all<Pet>();
  return c.json(result.results);
});

pets.get('/api/pets/:id', async (c) => {
  const pet = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), USER_ID)
    .first<Pet>();
  if (!pet) return c.json({ error: 'Pet not found' }, 404);
  return c.json(pet);
});

pets.post('/api/pets', async (c) => {
  const body = await c.req.json<CreatePetRequest>();
  const activityLevel = (body.activity_level || 'normal') as ActivityLevel;
  const mer = body.weight_kg ? calculateMER(body.weight_kg, activityLevel) : null;

  const result = await c.env.DB.prepare(
    `INSERT INTO pets (user_id, name, breed, weight_kg, birth_date, neutered, activity_level, target_kcal_override, calculated_mer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      USER_ID,
      body.name,
      body.breed ?? null,
      body.weight_kg ?? null,
      body.birth_date ?? null,
      body.neutered === false ? 0 : 1,
      activityLevel,
      body.target_kcal_override ?? null,
      mer
    )
    .first<Pet>();

  return c.json(result, 201);
});

pets.put('/api/pets/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<CreatePetRequest>>();

  const existing = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(id, USER_ID)
    .first<Pet>();
  if (!existing) return c.json({ error: 'Pet not found' }, 404);

  const weightKg = body.weight_kg ?? existing.weight_kg;
  const activityLevel = (body.activity_level ?? existing.activity_level) as ActivityLevel;
  const mer = weightKg ? calculateMER(weightKg, activityLevel) : existing.calculated_mer;

  const result = await c.env.DB.prepare(
    `UPDATE pets SET name = ?, breed = ?, weight_kg = ?, birth_date = ?, neutered = ?, activity_level = ?,
     target_kcal_override = ?, calculated_mer = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ? RETURNING *`
  )
    .bind(
      body.name ?? existing.name,
      body.breed ?? existing.breed,
      weightKg,
      body.birth_date ?? existing.birth_date,
      body.neutered !== undefined ? (body.neutered ? 1 : 0) : existing.neutered,
      activityLevel,
      body.target_kcal_override ?? existing.target_kcal_override,
      mer,
      id,
      USER_ID
    )
    .first<Pet>();

  return c.json(result);
});

export default pets;
