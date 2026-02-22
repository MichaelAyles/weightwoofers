import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv, User, Session } from '../types';
import { hashPassword, verifyPassword, generateSessionToken } from '../services/auth';

const auth = new Hono<AppEnv>();

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function sessionExpiry(): string {
  return new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
}

function setSessionCookie(c: any, token: string) {
  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

auth.post('/api/auth/signup', async (c) => {
  const { email, password, name } = await c.req.json<{
    email: string;
    password: string;
    name?: string;
  }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first();
  if (existing) {
    return c.json({ error: 'Email already in use' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING *'
  )
    .bind(email.toLowerCase().trim(), passwordHash, name?.trim() || null)
    .first<User>();

  const token = generateSessionToken();
  await c.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  )
    .bind(token, user!.id, sessionExpiry())
    .run();

  setSessionCookie(c, token);

  return c.json({
    user: { id: user!.id, email: user!.email, name: user!.name, is_admin: user!.is_admin },
  }, 201);
});

auth.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first<User>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = generateSessionToken();
  await c.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  )
    .bind(token, user.id, sessionExpiry())
    .run();

  setSessionCookie(c, token);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
  });
});

auth.post('/api/auth/logout', async (c) => {
  const token = getCookie(c, 'session');
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
  }
  deleteCookie(c, 'session', { path: '/' });
  return c.json({ ok: true });
});

auth.get('/api/auth/me', async (c) => {
  const token = getCookie(c, 'session');
  if (!token) {
    return c.json({ user: null });
  }

  const session = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')'
  )
    .bind(token)
    .first<Session>();

  if (!session) {
    return c.json({ user: null });
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(session.user_id)
    .first<User>();

  if (!user) {
    return c.json({ user: null });
  }

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
  });
});

export default auth;
