import type { Food, Clarification } from '../types';

interface PendingQuestion {
  field: string;
  question: string;
  priority: number;
}

export function generateClarifications(
  food: Food,
  candidates?: Food[]
): PendingQuestion[] {
  const questions: PendingQuestion[] = [];

  // Priority 0: variant disambiguation
  if (candidates && candidates.length > 1) {
    const options = candidates.map((c) => c.canonical_name).join('" or "');
    questions.push({
      field: 'variant',
      question: `Which one did you mean: "${options}"?`,
      priority: 0,
    });
  } else if (!food.variant && food.brand) {
    questions.push({
      field: 'variant',
      question: `What variant of ${food.brand} is this? (e.g. Adult Chicken, Puppy Lamb)`,
      priority: 0,
    });
  }

  // Priority 1: serving weight
  if (food.serving_weight_g == null && food.serving_unit) {
    questions.push({
      field: 'serving_weight_g',
      question: `How many grams is one ${food.serving_unit}? (weigh it once for accurate tracking)`,
      priority: 1,
    });
  }

  // Priority 2: nutrition data
  if (food.kcal_per_100g == null) {
    questions.push({
      field: 'kcal_per_100g',
      question: `What's the kcal/100g for ${food.canonical_name}? (check the guaranteed analysis on the packet)`,
      priority: 2,
    });
  }

  // Max 2 questions per logging event
  return questions.sort((a, b) => a.priority - b.priority).slice(0, 2);
}
