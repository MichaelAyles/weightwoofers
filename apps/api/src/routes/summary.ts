import { Hono } from 'hono';
import type { Pet, LogEntry, DailySummary } from '../types';

type Bindings = { DB: D1Database; OPENROUTER_API_KEY: string };

const summary = new Hono<{ Bindings: Bindings }>();

const USER_ID = 'default_user';

summary.get('/api/summary/:pet_id', async (c) => {
  const petId = c.req.param('pet_id');
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10);

  const pet = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(petId, USER_ID)
    .first<Pet>();
  if (!pet) return c.json({ error: 'Pet not found' }, 404);

  const entries = await c.env.DB.prepare(
    `SELECT * FROM log_entries WHERE user_id = ? AND pet_id = ? AND date(logged_at) = ? ORDER BY logged_at`
  )
    .bind(USER_ID, petId, date)
    .all<LogEntry>();

  const totalKcal = entries.results.reduce((sum, e) => sum + (e.kcal ?? 0), 0);
  const budgetKcal = pet.target_kcal_override ?? pet.calculated_mer ?? 0;

  const result: DailySummary = {
    total_kcal: totalKcal,
    budget_kcal: budgetKcal,
    remaining_kcal: budgetKcal - totalKcal,
    entries_today: entries.results,
    percentage: budgetKcal > 0 ? (totalKcal / budgetKcal) * 100 : 0,
  };

  return c.json(result);
});

export default summary;
