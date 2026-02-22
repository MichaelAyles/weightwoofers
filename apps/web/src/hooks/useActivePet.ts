import { useState, useEffect, useCallback } from 'react';
import type { Pet } from '../lib/types';

const STORAGE_KEY = 'weightwoofers_active_pet_id';

export function useActivePet(pets: Pet[]) {
  const [activePetId, setActivePetId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  // Validate stored ID against current pet list
  useEffect(() => {
    if (pets.length === 0) return;
    const valid = pets.find((p) => p.id === activePetId);
    if (!valid) {
      const fallback = pets[0].id;
      setActivePetId(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [pets, activePetId]);

  const activePet = pets.find((p) => p.id === activePetId) ?? pets[0] ?? null;

  const setActivePet = useCallback((id: string) => {
    setActivePetId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { activePet, setActivePet };
}
