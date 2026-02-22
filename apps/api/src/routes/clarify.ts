import { Hono } from 'hono';
import type { AppEnv, Food, Clarification, ClarifyRequest, LogEntry } from '../types';
import { calculateCompleteness, calculateEntryKcal, resolveWeightG } from '../services/nutrition';

const clarify = new Hono<AppEnv>();

clarify.post('/api/clarify', async (c) => {
  const userId = c.get('userId');
  const { clarification_id, value } = await c.req.json<ClarifyRequest>();

  // Get clarification
  const clar = await c.env.DB.prepare(
    'SELECT * FROM clarifications WHERE id = ? AND user_id = ?'
  )
    .bind(clarification_id, userId)
    .first<Clarification>();
  if (!clar) return c.json({ error: 'Clarification not found' }, 404);
  if (clar.resolved) return c.json({ error: 'Already resolved' }, 400);

  // Resolve the clarification
  await c.env.DB.prepare(
    `UPDATE clarifications SET resolved = 1, resolved_value = ? WHERE id = ?`
  )
    .bind(value, clarification_id)
    .run();

  // Update the food record
  if (clar.food_id) {
    const food = await c.env.DB.prepare('SELECT * FROM foods WHERE id = ?')
      .bind(clar.food_id)
      .first<Food>();

    if (food) {
      const field = clar.field;
      const numericFields = ['serving_weight_g', 'kcal_per_100g', 'protein_pct', 'fat_pct', 'fibre_pct', 'moisture_pct'];
      const isNumeric = numericFields.includes(field);
      const updateValue = isNumeric ? parseFloat(value) : value;

      // Update the specific field
      await c.env.DB.prepare(
        `UPDATE foods SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(updateValue, food.id)
        .run();

      // Recalculate completeness
      const updatedFood = await c.env.DB.prepare('SELECT * FROM foods WHERE id = ?')
        .bind(food.id)
        .first<Food>();
      if (updatedFood) {
        const score = calculateCompleteness(updatedFood);
        await c.env.DB.prepare('UPDATE foods SET completeness_score = ? WHERE id = ?')
          .bind(score, food.id)
          .run();

        // Recalculate kcal for affected log entries if kcal_per_100g or serving_weight_g changed
        if (field === 'kcal_per_100g' || field === 'serving_weight_g') {
          const entries = await c.env.DB.prepare(
            'SELECT * FROM log_entries WHERE food_id = ?'
          )
            .bind(food.id)
            .all<LogEntry>();

          for (const entry of entries.results) {
            const weightG = entry.weight_g ?? (entry.quantity && entry.unit
              ? resolveWeightG(entry.quantity, entry.unit, updatedFood)
              : null);
            const kcal = weightG != null && updatedFood.kcal_per_100g != null
              ? calculateEntryKcal(weightG, updatedFood.kcal_per_100g)
              : null;
            if (weightG != null || kcal != null) {
              await c.env.DB.prepare(
                'UPDATE log_entries SET weight_g = COALESCE(?, weight_g), kcal = ? WHERE id = ?'
              )
                .bind(weightG, kcal, entry.id)
                .run();
            }
          }
        }
      }
    }
  }

  // Get remaining unresolved clarifications
  const remaining = await c.env.DB.prepare(
    `SELECT * FROM clarifications WHERE user_id = ? AND resolved = 0 ORDER BY priority`
  )
    .bind(userId)
    .all<Clarification>();

  return c.json({ resolved: true, remaining: remaining.results });
});

export default clarify;
