import { Hono } from 'hono';
import type { AppEnv, Pet, CreatePetRequest, ActivityLevel } from '../types';
import { calculateMER } from '../services/nutrition';

const pets = new Hono<AppEnv>();

pets.get('/api/pets', async (c) => {
  const userId = c.get('userId');
  const result = await c.env.DB.prepare(
    'SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(userId)
    .all<Pet>();
  return c.json(result.results);
});

pets.get('/api/pets/:id', async (c) => {
  const userId = c.get('userId');
  const pet = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .first<Pet>();
  if (!pet) return c.json({ error: 'Pet not found' }, 404);
  return c.json(pet);
});

pets.post('/api/pets', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<CreatePetRequest>();
  const activityLevel = (body.activity_level || 'normal') as ActivityLevel;
  const mer = body.weight_kg ? calculateMER(body.weight_kg, activityLevel) : null;

  const result = await c.env.DB.prepare(
    `INSERT INTO pets (user_id, name, breed, weight_kg, birth_date, neutered, activity_level, target_kcal_override, calculated_mer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      userId,
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
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json<Partial<CreatePetRequest>>();

  const existing = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(id, userId)
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
      userId
    )
    .first<Pet>();

  return c.json(result);
});

pets.delete('/api/pets/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<Pet>();
  if (!existing) return c.json({ error: 'Pet not found' }, 404);

  // Cascade delete: clarifications → log_entries → pet
  await c.env.DB.prepare(
    'DELETE FROM clarifications WHERE log_entry_id IN (SELECT id FROM log_entries WHERE pet_id = ? AND user_id = ?)'
  )
    .bind(id, userId)
    .run();
  await c.env.DB.prepare('DELETE FROM log_entries WHERE pet_id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  await c.env.DB.prepare('DELETE FROM pets WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();

  return c.json({ ok: true });
});

export default pets;
