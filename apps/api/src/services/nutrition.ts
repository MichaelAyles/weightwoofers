import type { Food, ActivityLevel } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  low: 1.2,
  normal: 1.4,
  moderate: 1.6,
  high: 1.8,
  very_high: 2.0,
};

export function calculateRER(weightKg: number): number {
  return 70 * Math.pow(weightKg, 0.75);
}

export function calculateMER(weightKg: number, activityLevel: ActivityLevel): number {
  return calculateRER(weightKg) * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateEntryKcal(weightG: number, kcalPer100g: number): number {
  return (weightG / 100) * kcalPer100g;
}

export function calculateCompleteness(food: Food): number {
  const fields: { key: keyof Food; weight: number }[] = [
    { key: 'variant', weight: 0.15 },
    { key: 'serving_weight_g', weight: 0.30 },
    { key: 'kcal_per_100g', weight: 0.25 },
    { key: 'protein_pct', weight: 0.10 },
    { key: 'fat_pct', weight: 0.10 },
    { key: 'fibre_pct', weight: 0.05 },
    { key: 'moisture_pct', weight: 0.05 },
  ];
  return fields.reduce((score, f) => score + (food[f.key] != null ? f.weight : 0), 0);
}

export function resolveWeightG(quantity: number, unit: string, food: Food): number | null {
  if (unit === 'g') return quantity;
  if (unit === 'kg') return quantity * 1000;
  if (food.serving_weight_g != null) return quantity * food.serving_weight_g;
  return null;
}

/**
 * Calculate kcal for a food entry, handling both per-item treats and weight-based foods.
 * Returns null if insufficient data to calculate.
 */
export function calculateEntryKcalForFood(
  quantity: number,
  unit: string,
  food: Food,
): number | null {
  // Per-item treats (dentasticks, etc.)
  if (food.kcal_per_item != null && (unit === 'item' || unit === 'piece' || unit === 'treat' || unit === 'stick')) {
    return food.kcal_per_item * quantity;
  }

  // Weight-based calculation
  const weightG = resolveWeightG(quantity, unit, food);
  if (weightG != null && food.kcal_per_100g != null) {
    return calculateEntryKcal(weightG, food.kcal_per_100g);
  }

  return null;
}
