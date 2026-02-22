// Database row types

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  weight_kg: number | null;
  birth_date: string | null;
  neutered: number;
  activity_level: string;
  target_kcal_override: number | null;
  calculated_mer: number | null;
  created_at: string;
  updated_at: string;
}

export interface Food {
  id: string;
  user_id: string;
  canonical_name: string;
  brand: string | null;
  variant: string | null;
  aliases: string | null; // JSON array
  serving_unit: string | null;
  serving_weight_g: number | null;
  kcal_per_100g: number | null;
  protein_pct: number | null;
  fat_pct: number | null;
  fibre_pct: number | null;
  moisture_pct: number | null;
  ash_pct: number | null;
  source: string | null;
  completeness_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  user_id: string;
  pet_id: string;
  food_id: string | null;
  raw_input: string;
  quantity: number | null;
  unit: string | null;
  weight_g: number | null;
  kcal: number | null;
  logged_at: string;
  meal_type: string | null;
}

export interface Clarification {
  id: string;
  user_id: string;
  log_entry_id: string | null;
  food_id: string | null;
  field: string;
  question: string;
  priority: number;
  resolved: number;
  resolved_value: string | null;
  created_at: string;
}

// API request/response types

export interface ParsedInput {
  brand_guess: string | null;
  variant_guess: string | null;
  quantity: number;
  unit: string;
  weight_g: number | null;
  meal_type: string | null;
  confidence: number;
}

export interface LogRequest {
  raw_input: string;
  pet_id: string;
}

export interface ClarifyRequest {
  clarification_id: string;
  value: string;
}

export interface DailySummary {
  total_kcal: number;
  budget_kcal: number;
  remaining_kcal: number;
  entries_today: LogEntry[];
  percentage: number;
}

export interface LogResponse {
  entry: LogEntry;
  clarifications: Clarification[];
  daily_summary: DailySummary;
}

export interface CreatePetRequest {
  name: string;
  breed?: string;
  weight_kg?: number;
  birth_date?: string;
  neutered?: boolean;
  activity_level?: string;
  target_kcal_override?: number;
}

export type ActivityLevel = 'low' | 'normal' | 'moderate' | 'high' | 'very_high';
