import { useState } from 'react';
import type { Clarification } from '../lib/types';
import { api } from '../lib/api';

export function useClarify() {
  const [loading, setLoading] = useState(false);

  async function resolve(clarificationId: string, value: string): Promise<{ remaining: Clarification[] } | null> {
    setLoading(true);
    try {
      return await api.post<{ resolved: boolean; remaining: Clarification[] }>('/api/clarify', {
        clarification_id: clarificationId,
        value,
      });
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { resolve, loading };
}
