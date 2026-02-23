export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1].trim() : trimmed;
}

export async function chatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  options: OpenRouterOptions = {}
): Promise<string> {
  const {
    model = 'google/gemini-3-flash-preview',
    temperature = 0.1,
    max_tokens = 500,
  } = options;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

export async function chatCompletionJSON<T>(
  apiKey: string,
  messages: ChatMessage[],
  options: OpenRouterOptions = {},
  maxRetries = 1,
): Promise<T> {
  const opts = { ...options, max_tokens: options.max_tokens ?? 1000 };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const raw = await chatCompletion(apiKey, messages, opts);
    try {
      return JSON.parse(stripMarkdownFences(raw)) as T;
    } catch {
      if (attempt === maxRetries) {
        throw new Error(`Failed to parse LLM JSON after ${maxRetries + 1} attempts. Raw: ${raw.slice(0, 200)}`);
      }
      // Retry with a nudge
      messages = [
        ...messages,
        { role: 'assistant', content: raw },
        { role: 'user', content: 'Your response was not valid JSON. Please respond with ONLY a JSON object, no markdown fences or extra text.' },
      ];
    }
  }
  throw new Error('Unreachable');
}
