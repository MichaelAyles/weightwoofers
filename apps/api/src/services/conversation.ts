import type {
  Food,
  Pet,
  LogEntry,
  DailySummary,
  ChatSession,
  ChatMessage,
  LLMResponse,
  ConversationAction,
  ActionSummary,
  ChatResponse,
  ChatResponseMessage,
} from '../types';
import { chatCompletionJSON, type ChatMessage as LLMChatMessage } from './openrouter';
import { calculateEntryKcalForFood, calculateCompleteness } from './nutrition';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface ConversationContext {
  db: D1Database;
  apiKey: string;
  model: string;
  userId: string;
  petId: string;
}

export async function handleConversationTurn(
  ctx: ConversationContext,
  userMessage: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const { db, apiKey, model, userId, petId } = ctx;

  // Load pet
  const pet = await db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?')
    .bind(petId, userId)
    .first<Pet>();
  if (!pet) throw new Error('Pet not found');

  // Load/create session
  const session = await resolveSession(db, userId, petId, sessionId);

  // Load conversation history
  const history = await db.prepare(
    'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
  ).bind(session.id).all<ChatMessage>();

  // Store user message
  await db.prepare(
    'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)'
  ).bind(session.id, 'user', userMessage).run();

  // Load user's food library
  const foodsResult = await db.prepare('SELECT * FROM foods WHERE user_id = ?')
    .bind(userId).all<Food>();
  const userFoods = foodsResult.results;

  // Load today's summary
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = await db.prepare(
    'SELECT * FROM log_entries WHERE user_id = ? AND pet_id = ? AND date(logged_at) = ? ORDER BY logged_at'
  ).bind(userId, petId, today).all<LogEntry>();
  const totalKcalBefore = todayEntries.results.reduce((sum, e) => sum + (e.kcal ?? 0), 0);
  const budgetKcal = pet.target_kcal_override ?? pet.calculated_mer ?? 0;

  // Build system prompt
  const systemPrompt = buildSystemPrompt(pet, userFoods, totalKcalBefore, budgetKcal);

  // Build LLM messages from history
  const llmMessages: LLMChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.results.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // Call LLM
  const llmResponse = await chatCompletionJSON<LLMResponse>(
    apiKey,
    llmMessages,
    { model, temperature: 0.3, max_tokens: 1500 },
  );

  // Execute actions server-side
  const actionSummaries: ActionSummary[] = [];
  const entriesLogged: LogEntry[] = [];
  let sessionCompleted = true;

  // Reload foods in case they get modified during action processing
  let currentFoods = userFoods;

  for (const action of llmResponse.actions) {
    const result = await executeAction(db, userId, petId, action, currentFoods);
    if (result.summary) actionSummaries.push(result.summary);
    if (result.entry) entriesLogged.push(result.entry);
    if (result.keepActive) sessionCompleted = false;
    if (result.foodsChanged) {
      const refreshed = await db.prepare('SELECT * FROM foods WHERE user_id = ?')
        .bind(userId).all<Food>();
      currentFoods = refreshed.results;
    }
  }

  // Store assistant message
  await db.prepare(
    'INSERT INTO chat_messages (session_id, role, content, tool_calls, tool_results) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    session.id,
    'assistant',
    llmResponse.message,
    llmResponse.actions.length > 0 ? JSON.stringify(llmResponse.actions) : null,
    actionSummaries.length > 0 ? JSON.stringify(actionSummaries) : null,
  ).run();

  // Update session status
  if (sessionCompleted) {
    await db.prepare(
      "UPDATE chat_sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
    ).bind(session.id).run();
  }

  // Build fresh daily summary
  const freshEntries = await db.prepare(
    'SELECT * FROM log_entries WHERE user_id = ? AND pet_id = ? AND date(logged_at) = ? ORDER BY logged_at'
  ).bind(userId, petId, today).all<LogEntry>();
  const totalKcal = freshEntries.results.reduce((sum, e) => sum + (e.kcal ?? 0), 0);

  const dailySummary: DailySummary = {
    total_kcal: totalKcal,
    budget_kcal: budgetKcal,
    remaining_kcal: budgetKcal - totalKcal,
    entries_today: freshEntries.results,
    percentage: budgetKcal > 0 ? (totalKcal / budgetKcal) * 100 : 0,
  };

  // Build response messages (just the new pair for this turn)
  const messages: ChatResponseMessage[] = [
    { role: 'user', content: userMessage },
    {
      role: 'assistant',
      content: llmResponse.message,
      actions: actionSummaries.length > 0 ? actionSummaries : undefined,
    },
  ];

  return {
    session_id: session.id,
    messages,
    entries_logged: entriesLogged,
    daily_summary: dailySummary,
    session_status: sessionCompleted ? 'completed' : 'active',
  };
}

async function resolveSession(
  db: D1Database,
  userId: string,
  petId: string,
  sessionId?: string,
): Promise<ChatSession> {
  // If session_id provided, try to reuse it
  if (sessionId) {
    const existing = await db.prepare(
      "SELECT * FROM chat_sessions WHERE id = ? AND user_id = ? AND status = 'active'"
    ).bind(sessionId, userId).first<ChatSession>();

    if (existing) {
      const createdAt = new Date(existing.created_at + 'Z').getTime();
      if (Date.now() - createdAt < SESSION_TIMEOUT_MS) {
        return existing;
      }
      // Expired — close it
      await db.prepare(
        "UPDATE chat_sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
      ).bind(existing.id).run();
    }
  }

  // Close any other active sessions for this user/pet
  await db.prepare(
    "UPDATE chat_sessions SET status = 'completed', completed_at = datetime('now') WHERE user_id = ? AND pet_id = ? AND status = 'active'"
  ).bind(userId, petId).run();

  // Create new session
  const session = await db.prepare(
    'INSERT INTO chat_sessions (user_id, pet_id) VALUES (?, ?) RETURNING *'
  ).bind(userId, petId).first<ChatSession>();

  return session!;
}

function buildSystemPrompt(
  pet: Pet,
  foods: Food[],
  totalKcalToday: number,
  budgetKcal: number,
): string {
  const foodLibrary = foods.map((f) => {
    const aliases = f.aliases ? JSON.parse(f.aliases) : [];
    const parts = [
      `id=${f.id}`,
      `name="${f.canonical_name}"`,
      f.brand ? `brand="${f.brand}"` : null,
      f.variant ? `variant="${f.variant}"` : null,
      aliases.length > 0 ? `aliases=[${aliases.map((a: string) => `"${a}"`).join(', ')}]` : null,
      f.serving_unit ? `serving_unit="${f.serving_unit}"` : null,
      f.serving_weight_g != null ? `serving_weight_g=${f.serving_weight_g}` : null,
      f.kcal_per_100g != null ? `kcal_per_100g=${f.kcal_per_100g}` : null,
      f.kcal_per_item != null ? `kcal_per_item=${f.kcal_per_item}` : null,
    ].filter(Boolean);
    return `  - ${parts.join(', ')}`;
  }).join('\n');

  return `You are a pet food logging assistant for ${pet.name}${pet.breed ? ` (${pet.breed})` : ''}.
${pet.weight_kg ? `Weight: ${pet.weight_kg} kg.` : ''}
Daily calorie budget: ${Math.round(budgetKcal)} kcal. Consumed today: ${Math.round(totalKcalToday)} kcal. Remaining: ${Math.round(budgetKcal - totalKcalToday)} kcal.

KNOWN FOOD LIBRARY:
${foodLibrary || '  (empty — no foods registered yet)'}

YOUR JOB:
- Parse what the user fed their pet from natural language
- Match against known foods (fuzzy match by name/alias/brand)
- If you find a match: log it using log_food with the food's id
- If no match: create a new food entry using create_food, then log it
- If information is missing to properly log (e.g. you don't know the brand, size, variant): ASK the user — don't guess
- If a food has no kcal data: ask the user or try to determine from common knowledge for well-known commercial products
- For treats sold individually (dentasticks, greenies): use kcal_per_item, not kcal_per_100g
- Users may mention multiple items in one message — handle each one
- When updating food nutrition info, use update_food

IMPORTANT RULES:
- Be conversational and brief. One or two sentences max.
- When you have enough info to log, DO IT — don't ask for confirmation
- Never invent or guess calorie values. If you genuinely know the nutritional data of a well-known commercial product (e.g., Pedigree Dentastix), you can use that. Otherwise, ask.
- For ambiguous inputs like "a treat" or "some food", ask what specifically
- If the user gives a shorthand/nickname, try to match it to known foods first

RESPONSE FORMAT — you MUST return valid JSON (no markdown fences):
{
  "message": "Your conversational reply to the user",
  "actions": [
    // Zero or more actions. Types:
    // { "action": "log_food", "food_id": "...", "quantity": 1, "unit": "item" }
    // { "action": "create_food", "canonical_name": "...", "brand": "...", "aliases": ["..."], "kcal_per_100g": 350, ... }
    // { "action": "update_food", "food_id": "...", "fields": { "kcal_per_100g": 350, ... } }
    // { "action": "add_alias", "food_id": "...", "alias": "nood" }
    // { "action": "ask_user" }  // signals you need more info — keeps session active
  ]
}

If you need to create a food AND log it in the same turn, use create_food first (it will return a food_id), then log_food with food_id "NEW" — the system will substitute the real ID.
When you need to ask the user something, include ask_user in actions so the session stays open.`;
}

interface ActionResult {
  summary?: ActionSummary;
  entry?: LogEntry;
  keepActive?: boolean;
  foodsChanged?: boolean;
}

async function executeAction(
  db: D1Database,
  userId: string,
  petId: string,
  action: ConversationAction,
  currentFoods: Food[],
): Promise<ActionResult> {
  switch (action.action) {
    case 'log_food': {
      let foodId = action.food_id;

      // Handle "NEW" placeholder — find the most recently created food by this user
      if (foodId === 'NEW') {
        const newest = await db.prepare(
          'SELECT id FROM foods WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
        ).bind(userId).first<{ id: string }>();
        if (!newest) return {};
        foodId = newest.id;
      }

      const food = currentFoods.find((f) => f.id === foodId)
        || await db.prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?')
          .bind(foodId, userId).first<Food>();
      if (!food) return {};

      const kcal = calculateEntryKcalForFood(action.quantity, action.unit, food);

      const entry = await db.prepare(
        `INSERT INTO log_entries (user_id, pet_id, food_id, raw_input, quantity, unit, weight_g, kcal, meal_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
      ).bind(
        userId,
        petId,
        food.id,
        `${action.quantity} ${action.unit} of ${food.canonical_name}`,
        action.quantity,
        action.unit,
        action.unit === 'g' ? action.quantity : (action.unit === 'kg' ? action.quantity * 1000 : (food.serving_weight_g ? action.quantity * food.serving_weight_g : null)),
        kcal,
        action.meal_type ?? null,
      ).first<LogEntry>();

      return {
        summary: {
          type: 'logged',
          description: `${action.quantity} ${action.unit} of ${food.canonical_name}`,
          kcal: kcal ?? undefined,
        },
        entry: entry ?? undefined,
      };
    }

    case 'create_food': {
      const aliases = action.aliases ? JSON.stringify(action.aliases) : null;
      const food = await db.prepare(
        `INSERT INTO foods (user_id, canonical_name, brand, variant, aliases, serving_unit, serving_weight_g, kcal_per_100g, kcal_per_item, protein_pct, fat_pct, fibre_pct, moisture_pct, source, completeness_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'chat', ?) RETURNING *`
      ).bind(
        userId,
        action.canonical_name,
        action.brand ?? null,
        action.variant ?? null,
        aliases,
        action.serving_unit ?? null,
        action.serving_weight_g ?? null,
        action.kcal_per_100g ?? null,
        action.kcal_per_item ?? null,
        action.protein_pct ?? null,
        action.fat_pct ?? null,
        action.fibre_pct ?? null,
        action.moisture_pct ?? null,
        0, // completeness will be recalculated
      ).first<Food>();

      if (food) {
        const score = calculateCompleteness(food);
        await db.prepare('UPDATE foods SET completeness_score = ? WHERE id = ?')
          .bind(score, food.id).run();
      }

      return {
        summary: {
          type: 'created_food',
          description: action.canonical_name,
        },
        foodsChanged: true,
      };
    }

    case 'update_food': {
      const setClauses: string[] = [];
      const values: (string | number | null)[] = [];

      for (const [key, val] of Object.entries(action.fields)) {
        setClauses.push(`${key} = ?`);
        values.push(val as string | number | null);
      }

      if (setClauses.length > 0) {
        setClauses.push("updated_at = datetime('now')");
        values.push(action.food_id);

        await db.prepare(
          `UPDATE foods SET ${setClauses.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        // Recalculate completeness
        const updated = await db.prepare('SELECT * FROM foods WHERE id = ?')
          .bind(action.food_id).first<Food>();
        if (updated) {
          const score = calculateCompleteness(updated);
          await db.prepare('UPDATE foods SET completeness_score = ? WHERE id = ?')
            .bind(score, updated.id).run();
        }

        // Backfill log entries that had null kcal for this food
        if (action.fields.kcal_per_100g != null || action.fields.kcal_per_item != null || action.fields.serving_weight_g != null) {
          await backfillLogEntries(db, action.food_id);
        }
      }

      return {
        summary: {
          type: 'updated_food',
          description: `Updated ${Object.keys(action.fields).join(', ')}`,
        },
        foodsChanged: true,
      };
    }

    case 'add_alias': {
      const food = await db.prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?')
        .bind(action.food_id, userId).first<Food>();
      if (!food) return {};

      const aliases: string[] = food.aliases ? JSON.parse(food.aliases) : [];
      const newAlias = action.alias.toLowerCase().trim();
      if (!aliases.includes(newAlias)) {
        aliases.push(newAlias);
        await db.prepare('UPDATE foods SET aliases = ? WHERE id = ?')
          .bind(JSON.stringify(aliases), food.id).run();
      }

      return {
        summary: {
          type: 'added_alias',
          description: `"${action.alias}" → ${food.canonical_name}`,
        },
        foodsChanged: true,
      };
    }

    case 'ask_user': {
      return { keepActive: true };
    }

    default:
      return {};
  }
}

async function backfillLogEntries(db: D1Database, foodId: string): Promise<void> {
  const food = await db.prepare('SELECT * FROM foods WHERE id = ?')
    .bind(foodId).first<Food>();
  if (!food) return;

  const entries = await db.prepare(
    'SELECT * FROM log_entries WHERE food_id = ? AND kcal IS NULL'
  ).bind(foodId).all<LogEntry>();

  for (const entry of entries.results) {
    if (entry.quantity != null && entry.unit) {
      const kcal = calculateEntryKcalForFood(entry.quantity, entry.unit, food);
      if (kcal != null) {
        await db.prepare('UPDATE log_entries SET kcal = ? WHERE id = ?')
          .bind(kcal, entry.id).run();
      }
    }
  }
}
