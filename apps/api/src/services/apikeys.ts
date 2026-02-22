import type { ApiKey } from '../types';

export async function getActiveApiKey(db: D1Database, envKey?: string): Promise<string | null> {
  const row = await db.prepare(
    "SELECT key_value FROM api_keys WHERE is_active = 1 AND provider = 'openrouter' ORDER BY created_at DESC LIMIT 1"
  ).first<Pick<ApiKey, 'key_value'>>();

  if (row?.key_value) return row.key_value;
  return envKey || null;
}
