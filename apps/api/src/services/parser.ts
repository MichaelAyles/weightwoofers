import type { ParsedInput, Food } from '../types';
import { chatCompletion } from './openrouter';

export async function parseInput(
  apiKey: string,
  rawInput: string,
  knownFoods: Pick<Food, 'canonical_name' | 'brand' | 'variant' | 'aliases'>[],
  model?: string
): Promise<ParsedInput> {
  const systemPrompt = `You are a pet food input parser. Extract structured data from natural language food logging.

Known foods for this user: ${JSON.stringify(knownFoods)}

Return ONLY valid JSON matching this schema:
{
  "brand_guess": string | null,
  "variant_guess": string | null,
  "quantity": number,
  "unit": string,
  "weight_g": number | null,
  "meal_type": string | null,
  "confidence": number
}

Rules:
- quantity defaults to 1 if not specified
- unit should be normalized: "scoop", "cup", "pouch", "piece", "handful", "g", "kg"
- meal_type can be "breakfast", "lunch", "dinner", "treat", "snack", or null
- confidence is 0-1 based on how sure you are about the match
- If a known food alias matches the input, use that food's brand/variant and set high confidence
- If the input is vague or ambiguous, set confidence low`;

  const content = await chatCompletion(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: rawInput },
  ], { max_tokens: 200, model });

  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as ParsedInput;
}
