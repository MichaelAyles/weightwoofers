import { useState, useEffect, useCallback } from 'react';
import type { Pet, CreatePetRequest } from '../lib/types';
import { api } from '../lib/api';

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<Pet[]>('/api/pets');
      setPets(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data: CreatePetRequest): Promise<Pet> => {
    const pet = await api.post<Pet>('/api/pets', data);
    await refresh();
    return pet;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<CreatePetRequest>): Promise<Pet> => {
    const pet = await api.put<Pet>(`/api/pets/${id}`, data);
    await refresh();
    return pet;
  }, [refresh]);

  const remove = useCallback(async (id: string): Promise<void> => {
    await api.del(`/api/pets/${id}`);
    await refresh();
  }, [refresh]);

  return { pets, loading, refresh, create, update, remove };
}
