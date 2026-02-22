import { useState } from 'react';
import type { Pet, CreatePetRequest, ActivityLevel } from '../lib/types';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Senior or very sedentary' },
  { value: 'normal', label: 'Normal', description: 'Typical neutered adult' },
  { value: 'moderate', label: 'Moderate', description: 'Regular exercise' },
  { value: 'high', label: 'High', description: 'Very active or intact' },
  { value: 'very_high', label: 'Very High', description: 'Working dog or puppy' },
];

interface PetFormProps {
  initial?: Pet;
  onSave: (data: CreatePetRequest) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function PetForm({ initial, onSave, onCancel, saving }: PetFormProps) {
  const [form, setForm] = useState<CreatePetRequest>({
    name: initial?.name ?? '',
    breed: initial?.breed ?? undefined,
    weight_kg: initial?.weight_kg ?? undefined,
    neutered: initial ? initial.neutered === 1 : true,
    activity_level: initial?.activity_level ?? 'normal',
  });
  const [error, setError] = useState('');

  const update = (fields: Partial<CreatePetRequest>) => setForm((f) => ({ ...f, ...fields }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    if (!form.weight_kg || form.weight_kg <= 0) return setError('Weight is required');
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  const merPreview = form.weight_kg
    ? Math.round(
        70 *
          Math.pow(form.weight_kg, 0.75) *
          ({ low: 1.2, normal: 1.4, moderate: 1.6, high: 1.8, very_high: 2.0 }[
            (form.activity_level as ActivityLevel) || 'normal'
          ])
      )
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-1">Pet's name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Biscuit"
          className="w-full rounded-lg border border-border px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Breed (optional)</label>
        <input
          type="text"
          value={form.breed || ''}
          onChange={(e) => update({ breed: e.target.value || undefined })}
          placeholder="e.g. Corgi"
          className="w-full rounded-lg border border-border px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Weight (kg)</label>
        <input
          type="number"
          step="0.1"
          value={form.weight_kg || ''}
          onChange={(e) => update({ weight_kg: parseFloat(e.target.value) || undefined })}
          placeholder="e.g. 12.5"
          className="w-full rounded-lg border border-border px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Neutered?</label>
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => update({ neutered: v })}
              className={`flex-1 py-2 rounded-lg border font-medium transition-colors ${
                form.neutered === v
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text hover:bg-surface-dim'
              }`}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Activity level</label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => update({ activity_level: level.value })}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                form.activity_level === level.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text hover:bg-surface-dim'
              }`}
            >
              <span className="font-medium">{level.label}</span>
              <span className={`text-sm ml-2 ${form.activity_level === level.value ? 'text-white/80' : 'text-text-muted'}`}>
                {level.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {merPreview && (
        <div className="bg-surface-dim rounded-lg p-3 text-sm text-text-muted">
          Estimated daily budget: <strong className="text-text">{merPreview} kcal</strong>
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-border text-text font-medium hover:bg-surface-dim transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
