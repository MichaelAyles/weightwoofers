import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Pet, Food, ApiKey } from '../lib/types';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  is_admin: number;
  created_at: string;
  pet_count: number;
}

interface AdminPet extends Pet {
  owner_email: string;
}

interface AdminFood extends Food {
  owner_email: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(res.users);
    } catch { setUsers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateUser = useCallback(async (id: string, data: { name?: string; is_admin?: number }) => {
    await api.put('/api/admin/users/' + id, data);
    await refresh();
  }, [refresh]);

  const deleteUser = useCallback(async (id: string) => {
    await api.del('/api/admin/users/' + id);
    await refresh();
  }, [refresh]);

  return { users, loading, refresh, updateUser, deleteUser };
}

export function useAdminKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ keys: ApiKey[] }>('/api/admin/keys');
      setKeys(res.keys);
    } catch { setKeys([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createKey = useCallback(async (data: { name: string; key_value: string; provider?: string }) => {
    await api.post('/api/admin/keys', data);
    await refresh();
  }, [refresh]);

  const updateKey = useCallback(async (id: string, data: { name?: string; is_active?: number }) => {
    await api.put('/api/admin/keys/' + id, data);
    await refresh();
  }, [refresh]);

  const deleteKey = useCallback(async (id: string) => {
    await api.del('/api/admin/keys/' + id);
    await refresh();
  }, [refresh]);

  return { keys, loading, refresh, createKey, updateKey, deleteKey };
}

export function useAdminPets() {
  const [pets, setPets] = useState<AdminPet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ pets: AdminPet[] }>('/api/admin/pets');
      setPets(res.pets);
    } catch { setPets([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const deletePet = useCallback(async (id: string) => {
    await api.del('/api/admin/pets/' + id);
    await refresh();
  }, [refresh]);

  return { pets, loading, refresh, deletePet };
}

export function useAdminFoods() {
  const [foods, setFoods] = useState<AdminFood[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ foods: AdminFood[] }>('/api/admin/foods');
      setFoods(res.foods);
    } catch { setFoods([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteFood = useCallback(async (id: string) => {
    await api.del('/api/admin/foods/' + id);
    await refresh();
  }, [refresh]);

  return { foods, loading, refresh, deleteFood };
}
