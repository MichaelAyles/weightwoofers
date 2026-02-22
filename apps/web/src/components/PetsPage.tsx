import { useState } from 'react';
import type { Pet, CreatePetRequest } from '../lib/types';
import { usePets } from '../hooks/usePets';
import { useActivePet } from '../hooks/useActivePet';
import { PetForm } from './PetForm';
import { useAuth } from '../contexts/AuthContext';

interface PetsPageProps {
  onBack: () => void;
}

export function PetsPage({ onBack }: PetsPageProps) {
  const { user, logout } = useAuth();
  const { pets, loading, create, update, remove } = usePets();
  const { activePet, setActivePet } = useActivePet(pets);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  async function handleCreate(data: CreatePetRequest) {
    setSaving(true);
    try {
      const pet = await create(data);
      setActivePet(pet.id);
      setMode('list');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(data: CreatePetRequest) {
    if (!editingPet) return;
    setSaving(true);
    try {
      await update(editingPet.id, data);
      setMode('list');
      setEditingPet(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await remove(id);
    } finally {
      setDeleting(null);
    }
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-surface-dim p-4">
        <div className="bg-surface rounded-2xl shadow-lg max-w-md mx-auto p-6">
          <h2 className="text-xl font-bold text-text mb-4">Add Pet</h2>
          <PetForm onSave={handleCreate} onCancel={() => setMode('list')} saving={saving} />
        </div>
      </div>
    );
  }

  if (mode === 'edit' && editingPet) {
    return (
      <div className="min-h-screen bg-surface-dim p-4">
        <div className="bg-surface rounded-2xl shadow-lg max-w-md mx-auto p-6">
          <h2 className="text-xl font-bold text-text mb-4">Edit {editingPet.name}</h2>
          <PetForm
            initial={editingPet}
            onSave={handleUpdate}
            onCancel={() => { setMode('list'); setEditingPet(null); }}
            saving={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dim">
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-primary hover:underline">&larr; Dashboard</button>
          <h1 className="font-bold text-text">Your Pets</h1>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-text-muted">{user.name || user.email}</span>}
          <button onClick={logout} className="text-sm text-text-muted hover:text-text transition-colors">
            Log out
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {pets.map((pet) => {
          const budget = pet.target_kcal_override ?? pet.calculated_mer;
          const isActive = pet.id === activePet?.id;

          return (
            <div
              key={pet.id}
              className={`bg-surface rounded-xl p-4 border ${
                isActive ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-text">
                    {pet.name}
                    {isActive && (
                      <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </h3>
                  {pet.breed && <p className="text-xs text-text-muted">{pet.breed}</p>}
                </div>
                {budget && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-text">{Math.round(budget)} kcal/day</p>
                    <p className="text-xs text-text-muted">
                      {pet.weight_kg} kg &middot; {pet.activity_level}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {!isActive && (
                  <button
                    onClick={() => setActivePet(pet.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Set Active
                  </button>
                )}
                <button
                  onClick={() => { setEditingPet(pet); setMode('edit'); }}
                  className="text-xs text-text-muted hover:text-text"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(pet.id)}
                  disabled={deleting === pet.id}
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                >
                  {deleting === pet.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setMode('create')}
          className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Add Pet
        </button>
      </div>
    </div>
  );
}
