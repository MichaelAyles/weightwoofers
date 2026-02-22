import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types';
import { authMiddleware } from './middleware/auth';
import auth from './routes/auth';
import pets from './routes/pets';
import foods from './routes/foods';
import log from './routes/log';
import clarify from './routes/clarify';
import summary from './routes/summary';

const app = new Hono<AppEnv>();

app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth middleware)
app.route('/', auth);

// Apply auth middleware to all other /api/* routes
app.use('/api/*', authMiddleware);

app.route('/', pets);
app.route('/', foods);
app.route('/', log);
app.route('/', clarify);
app.route('/', summary);

export default app;
