import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pets from './routes/pets';
import foods from './routes/foods';
import log from './routes/log';
import clarify from './routes/clarify';
import summary from './routes/summary';

type Bindings = {
  DB: D1Database;
  OPENROUTER_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', cors());

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/', pets);
app.route('/', foods);
app.route('/', log);
app.route('/', clarify);
app.route('/', summary);

export default app;
