import { Hono } from 'hono';
import type { AppEnv, ApiKey } from '../types';

const admin = new Hono<AppEnv>();

// --- Users ---

admin.get('/api/admin/users', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.is_admin, u.created_at,
           COUNT(p.id) as pet_count
    FROM users u
    LEFT JOIN pets p ON p.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  return c.json({ users: results });
});

admin.put('/api/admin/users/:id', async (c) => {
  const id = c.req.param('id');
  const { name, is_admin } = await c.req.json<{ name?: string; is_admin?: number }>();

  const sets: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) {
    sets.push('name = ?');
    values.push(name);
  }
  if (is_admin !== undefined) {
    sets.push('is_admin = ?');
    values.push(is_admin);
  }

  if (sets.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await c.env.DB.prepare(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run();

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, is_admin, created_at FROM users WHERE id = ?'
  )
    .bind(id)
    .first();

  return c.json({ user });
});

admin.delete('/api/admin/users/:id', async (c) => {
  const id = c.req.param('id');

  // Prevent self-deletion
  const currentUserId = c.get('userId');
  if (id === currentUserId) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  // Cascade: clarifications, log_entries, foods, pets, sessions, user
  await c.env.DB.prepare('DELETE FROM clarifications WHERE user_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM log_entries WHERE user_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM foods WHERE user_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM pets WHERE user_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

  return c.json({ ok: true });
});

// --- API Keys ---

admin.get('/api/admin/keys', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, provider, is_active, created_at, updated_at FROM api_keys ORDER BY created_at DESC'
  ).all();
  return c.json({ keys: results });
});

admin.post('/api/admin/keys', async (c) => {
  const { name, key_value, provider } = await c.req.json<{
    name: string;
    key_value: string;
    provider?: string;
  }>();

  if (!name || !key_value) {
    return c.json({ error: 'Name and key_value are required' }, 400);
  }

  const key = await c.env.DB.prepare(
    'INSERT INTO api_keys (name, key_value, provider) VALUES (?, ?, ?) RETURNING *'
  )
    .bind(name, key_value, provider || 'openrouter')
    .first<ApiKey>();

  return c.json({ key: { ...key, key_value: maskKey(key!.key_value) } }, 201);
});

admin.put('/api/admin/keys/:id', async (c) => {
  const id = c.req.param('id');
  const { name, is_active } = await c.req.json<{ name?: string; is_active?: number }>();

  const sets: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) {
    sets.push('name = ?');
    values.push(name);
  }
  if (is_active !== undefined) {
    sets.push('is_active = ?');
    values.push(is_active);
  }

  if (sets.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  sets.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE api_keys SET ${sets.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run();

  const key = await c.env.DB.prepare(
    'SELECT id, name, provider, is_active, created_at, updated_at FROM api_keys WHERE id = ?'
  )
    .bind(id)
    .first();

  return c.json({ key });
});

admin.delete('/api/admin/keys/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// --- Pets ---

admin.get('/api/admin/pets', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT p.*, u.email as owner_email
    FROM pets p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
  `).all();
  return c.json({ pets: results });
});

admin.delete('/api/admin/pets/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM clarifications WHERE log_entry_id IN (SELECT id FROM log_entries WHERE pet_id = ?)').bind(id).run();
  await c.env.DB.prepare('DELETE FROM log_entries WHERE pet_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM pets WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// --- Foods ---

admin.get('/api/admin/foods', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT f.*, u.email as owner_email
    FROM foods f
    JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
  `).all();
  return c.json({ foods: results });
});

admin.delete('/api/admin/foods/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM clarifications WHERE food_id = ?').bind(id).run();
  await c.env.DB.prepare('UPDATE log_entries SET food_id = NULL WHERE food_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM foods WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

export default admin;
