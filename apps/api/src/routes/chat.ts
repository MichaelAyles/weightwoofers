import { Hono } from 'hono';
import type { AppEnv, ChatRequest } from '../types';
import { getActiveLLMConfig } from '../services/apikeys';
import { handleConversationTurn } from '../services/conversation';

const chat = new Hono<AppEnv>();

chat.post('/api/chat', async (c) => {
  const userId = c.get('userId');
  const { pet_id, message, session_id } = await c.req.json<ChatRequest>();

  if (!pet_id || !message?.trim()) {
    return c.json({ error: 'pet_id and message are required' }, 400);
  }

  const llm = await getActiveLLMConfig(c.env.DB, c.env.OPENROUTER_API_KEY);
  if (!llm) {
    return c.json({ error: 'No API key configured' }, 500);
  }

  try {
    const response = await handleConversationTurn(
      {
        db: c.env.DB,
        apiKey: llm.apiKey,
        model: llm.model,
        userId,
        petId: pet_id,
      },
      message.trim(),
      session_id,
    );
    return c.json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Chat failed';
    return c.json({ error: msg }, 500);
  }
});

export default chat;
