import { useState, useEffect, useCallback } from 'react';
import type { DailySummary } from '../lib/types';
import { api } from '../lib/api';

export function useDailySummary(petId: string | null) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!petId) return;
    setLoading(true);
    try {
      const data = await api.get<DailySummary>(`/api/summary/${petId}`);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { summary, loading, refresh };
}
