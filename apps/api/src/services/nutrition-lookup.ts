import { chatCompletion } from './openrouter';

interface NutritionData {
  kcal_per_100g: number | null;
  protein_pct: number | null;
  fat_pct: number | null;
  fibre_pct: number | null;
  moisture_pct: number | null;
}

export async function lookupNutrition(
  apiKey: string,
  foodName: string,
  brand: string | null,
  variant: string | null
): Promise<NutritionData | null> {
  const query = [brand, variant, foodName].filter(Boolean).join(' ');

  try {
    const content = await chatCompletion(apiKey, [
      {
        role: 'system',
        content: `You are a pet food nutrition database. Look up the guaranteed analysis for the given dog food.
Return ONLY valid JSON matching this schema:
{
  "kcal_per_100g": number | null,
  "protein_pct": number | null,
  "fat_pct": number | null,
  "fibre_pct": number | null,
  "moisture_pct": number | null,
  "confident": boolean
}
If you're not confident about the data, set "confident" to false and null for fields you're unsure about.`,
      },
      { role: 'user', content: `Look up nutrition for: ${query} dog food` },
    ], { max_tokens: 200 });

    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleaned) as NutritionData & { confident: boolean };

    if (!data.confident || data.kcal_per_100g == null) return null;
    return {
      kcal_per_100g: data.kcal_per_100g,
      protein_pct: data.protein_pct,
      fat_pct: data.fat_pct,
      fibre_pct: data.fibre_pct,
      moisture_pct: data.moisture_pct,
    };
  } catch {
    return null;
  }
}
