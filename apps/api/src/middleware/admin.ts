import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

export const adminMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare(
    'SELECT is_admin FROM users WHERE id = ?'
  )
    .bind(userId)
    .first<{ is_admin: number }>();

  if (!user || user.is_admin !== 1) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});
