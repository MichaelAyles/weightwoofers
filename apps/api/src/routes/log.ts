import { Hono } from 'hono';
import type { AppEnv, Food, LogEntry, Clarification, LogRequest, LogResponse, Pet } from '../types';
import { parseInput } from '../services/parser';
import { matchFood } from '../services/matcher';
import { resolveWeightG, calculateEntryKcal, calculateCompleteness } from '../services/nutrition';
import { generateClarifications } from '../services/profiler';
import { lookupNutrition } from '../services/nutrition-lookup';
import { getActiveApiKey } from '../services/apikeys';

const log = new Hono<AppEnv>();

log.post('/api/log', async (c) => {
  const userId = c.get('userId');
  const { raw_input, pet_id } = await c.req.json<LogRequest>();

  // Get pet for budget
  const pet = await c.env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(pet_id, userId)
    .first<Pet>();
  if (!pet) return c.json({ error: 'Pet not found' }, 404);

  // Get user's known foods
  const foodsResult = await c.env.DB.prepare('SELECT * FROM foods WHERE user_id = ?')
    .bind(userId)
    .all<Food>();
  const userFoods = foodsResult.results;

  // Resolve API key (DB first, env fallback)
  const apiKey = await getActiveApiKey(c.env.DB, c.env.OPENROUTER_API_KEY);
  if (!apiKey) return c.json({ error: 'No API key configured' }, 500);

  // Parse input via LLM
  const parsed = await parseInput(
    apiKey,
    raw_input,
    userFoods.map((f) => ({
      canonical_name: f.canonical_name,
      brand: f.brand,
      variant: f.variant,
      aliases: f.aliases,
    }))
  );

  // Match against known foods
  const match = matchFood(parsed, userFoods);

  let food: Food | null = null;
  let clarifications: Clarification[] = [];

  if (match.type === 'exact' || match.type === 'fuzzy') {
    food = match.food!;
    // Auto-learn alias: add raw_input as alias if it's not already known
    const inputLower = raw_input.toLowerCase().trim();
    const existingAliases: string[] = food.aliases ? JSON.parse(food.aliases) : [];
    if (!existingAliases.includes(inputLower) && inputLower !== food.canonical_name.toLowerCase()) {
      existingAliases.push(inputLower);
      await c.env.DB.prepare('UPDATE foods SET aliases = ? WHERE id = ?')
        .bind(JSON.stringify(existingAliases), food.id)
        .run();
    }
  } else if (match.type === 'multiple') {
    // Use first candidate as tentative, ask for clarification
    food = match.candidates![0];
  } else {
    // No match — create new food stub
    const canonicalName = [parsed.brand_guess, parsed.variant_guess].filter(Boolean).join(' ') || raw_input;
    const aliases = JSON.stringify([raw_input.toLowerCase()]);
    food = await c.env.DB.prepare(
      `INSERT INTO foods (user_id, canonical_name, brand, variant, aliases, serving_unit, completeness_score, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(userId, canonicalName, parsed.brand_guess, parsed.variant_guess, aliases, parsed.unit, 0, 'auto')
      .first<Food>();

    // Attempt LLM nutrition auto-lookup for new foods
    if (food && food.kcal_per_100g == null) {
      try {
        const nutrition = await lookupNutrition(
          apiKey,
          food.canonical_name,
          food.brand,
          food.variant
        );
        if (nutrition) {
          await c.env.DB.prepare(
            `UPDATE foods SET kcal_per_100g = ?, protein_pct = ?, fat_pct = ?, fibre_pct = ?,
             moisture_pct = ?, source = 'llm_lookup', updated_at = datetime('now') WHERE id = ?`
          )
            .bind(nutrition.kcal_per_100g, nutrition.protein_pct, nutrition.fat_pct, nutrition.fibre_pct, nutrition.moisture_pct, food.id)
            .run();
          // Refresh food object
          food = await c.env.DB.prepare('SELECT * FROM foods WHERE id = ?').bind(food.id).first<Food>() ?? food;
        }
      } catch {
        // Lookup failed — will fall through to clarification questions
      }
    }
  }

  // Resolve weight and kcal
  const weightG = food ? resolveWeightG(parsed.quantity, parsed.unit, food) : null;
  const kcal = weightG != null && food?.kcal_per_100g != null
    ? calculateEntryKcal(weightG, food.kcal_per_100g)
    : null;

  // Create log entry
  const entry = await c.env.DB.prepare(
    `INSERT INTO log_entries (user_id, pet_id, food_id, raw_input, quantity, unit, weight_g, kcal, meal_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  )
    .bind(userId, pet_id, food?.id ?? null, raw_input, parsed.quantity, parsed.unit, weightG, kcal, parsed.meal_type)
    .first<LogEntry>();

  // Generate clarifications if food is incomplete
  if (food) {
    const questions = generateClarifications(
      food,
      match.type === 'multiple' ? match.candidates : undefined
    );

    for (const q of questions) {
      const clar = await c.env.DB.prepare(
        `INSERT INTO clarifications (user_id, log_entry_id, food_id, field, question, priority)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
      )
        .bind(userId, entry!.id, food.id, q.field, q.question, q.priority)
        .first<Clarification>();
      if (clar) clarifications.push(clar);
    }
  }

  // Build daily summary
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = await c.env.DB.prepare(
    `SELECT * FROM log_entries WHERE user_id = ? AND pet_id = ? AND date(logged_at) = ? ORDER BY logged_at`
  )
    .bind(userId, pet_id, today)
    .all<LogEntry>();

  const totalKcal = todayEntries.results.reduce((sum, e) => sum + (e.kcal ?? 0), 0);
  const budgetKcal = pet.target_kcal_override ?? pet.calculated_mer ?? 0;

  const response: LogResponse = {
    entry: entry!,
    clarifications,
    daily_summary: {
      total_kcal: totalKcal,
      budget_kcal: budgetKcal,
      remaining_kcal: budgetKcal - totalKcal,
      entries_today: todayEntries.results,
      percentage: budgetKcal > 0 ? (totalKcal / budgetKcal) * 100 : 0,
    },
  };

  return c.json(response);
});

export default log;
