import { useState } from 'react';
import type { LogResponse } from '../lib/types';
import { api } from '../lib/api';

export function useLogFood(petId: string | null) {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<LogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function logFood(rawInput: string): Promise<LogResponse | null> {
    if (!petId || !rawInput.trim()) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<LogResponse>('/api/log', { raw_input: rawInput, pet_id: petId });
      setLastResponse(res);
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log food');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { logFood, loading, lastResponse, error };
}
