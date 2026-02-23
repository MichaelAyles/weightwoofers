// App environment type for Hono
export type AppEnv = {
  Bindings: {
    DB: D1Database;
    OPENROUTER_API_KEY?: string;
  };
  Variables: {
    userId: string;
  };
};

// Auth types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  is_admin: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  provider: string;
  model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

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
  kcal_per_item: number | null;
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

// Chat / Conversational types

export interface ChatSession {
  id: string;
  user_id: string;
  pet_id: string;
  status: 'active' | 'completed';
  created_at: string;
  completed_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls: string | null; // JSON
  tool_results: string | null; // JSON
  created_at: string;
}

// Actions the LLM can request
export interface LogFoodAction {
  action: 'log_food';
  food_id: string;
  quantity: number;
  unit: string;
  meal_type?: string;
}

export interface CreateFoodAction {
  action: 'create_food';
  canonical_name: string;
  brand?: string;
  variant?: string;
  aliases?: string[];
  serving_unit?: string;
  serving_weight_g?: number;
  kcal_per_100g?: number;
  kcal_per_item?: number;
  protein_pct?: number;
  fat_pct?: number;
  fibre_pct?: number;
  moisture_pct?: number;
}

export interface UpdateFoodAction {
  action: 'update_food';
  food_id: string;
  fields: Partial<{
    canonical_name: string;
    brand: string;
    variant: string;
    serving_unit: string;
    serving_weight_g: number;
    kcal_per_100g: number;
    kcal_per_item: number;
    protein_pct: number;
    fat_pct: number;
    fibre_pct: number;
    moisture_pct: number;
  }>;
}

export interface AddAliasAction {
  action: 'add_alias';
  food_id: string;
  alias: string;
}

export interface AskUserAction {
  action: 'ask_user';
}

export type ConversationAction =
  | LogFoodAction
  | CreateFoodAction
  | UpdateFoodAction
  | AddAliasAction
  | AskUserAction;

export interface LLMResponse {
  message: string;
  actions: ConversationAction[];
}

export interface ChatRequest {
  pet_id: string;
  message: string;
  session_id?: string;
}

export interface ActionSummary {
  type: 'logged' | 'created_food' | 'updated_food' | 'added_alias';
  description: string;
  kcal?: number;
}

export interface ChatResponseMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionSummary[];
}

export interface ChatResponse {
  session_id: string;
  messages: ChatResponseMessage[];
  entries_logged: LogEntry[];
  daily_summary: DailySummary;
  session_status: 'active' | 'completed';
}
