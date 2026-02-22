import { useState, useEffect, useCallback } from 'react';
import type { Pet } from '../lib/types';
import { api } from '../lib/api';

export function usePet() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const pets = await api.get<Pet[]>('/api/pets');
      setPet(pets.length > 0 ? pets[0] : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { pet, setPet, loading, refresh };
}
