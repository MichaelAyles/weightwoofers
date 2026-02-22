import type { ApiKey } from '../types';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

interface LLMConfig {
  apiKey: string;
  model: string;
}

export async function getActiveLLMConfig(db: D1Database, envKey?: string): Promise<LLMConfig | null> {
  const row = await db.prepare(
    "SELECT key_value, model FROM api_keys WHERE is_active = 1 AND provider = 'openrouter' ORDER BY created_at DESC LIMIT 1"
  ).first<Pick<ApiKey, 'key_value' | 'model'>>();

  if (row?.key_value) {
    return { apiKey: row.key_value, model: row.model || DEFAULT_MODEL };
  }

  if (envKey) {
    return { apiKey: envKey, model: DEFAULT_MODEL };
  }

  return null;
}

// Backwards-compat alias
export async function getActiveApiKey(db: D1Database, envKey?: string): Promise<string | null> {
  const config = await getActiveLLMConfig(db, envKey);
  return config?.apiKey || null;
}
