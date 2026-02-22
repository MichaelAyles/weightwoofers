import { useState } from 'react';
import type { Pet, CreatePetRequest, ActivityLevel } from '../lib/types';
import { api } from '../lib/api';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Senior or very sedentary' },
  { value: 'normal', label: 'Normal', description: 'Typical neutered adult' },
  { value: 'moderate', label: 'Moderate', description: 'Regular exercise' },
  { value: 'high', label: 'High', description: 'Very active or intact' },
  { value: 'very_high', label: 'Very High', description: 'Working dog or puppy' },
];

export function OnboardingWizard({ onComplete }: { onComplete: (pet?: Pet) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreatePetRequest>({
    name: '',
    weight_kg: undefined,
    neutered: true,
    activity_level: 'normal',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (fields: Partial<CreatePetRequest>) => setForm((f) => ({ ...f, ...fields }));

  async function handleSubmit() {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.weight_kg || form.weight_kg <= 0) return setError('Weight is required');
    setSaving(true);
    setError('');
    try {
      const pet = await api.post<Pet>('/api/pets', form);
      onComplete(pet);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-dim flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-lg max-w-md w-full p-6">
        <h1 className="text-2xl font-bold text-text mb-1">WeightWoofers</h1>
        <p className="text-text-muted mb-6">Let's set up your pet's profile</p>

        {step === 0 && (
          <div className="space-y-4">
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
            <button
              onClick={() => form.name.trim() ? setStep(1) : setError('Name is required')}
              className="w-full bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight_kg || ''}
                onChange={(e) => update({ weight_kg: parseFloat(e.target.value) || undefined })}
                placeholder="e.g. 12.5"
                className="w-full rounded-lg border border-border px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Neutered?</label>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
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
            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-2 rounded-lg border border-border text-text font-medium hover:bg-surface-dim transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => form.weight_kg ? setStep(2) : setError('Weight is required')}
                className="flex-1 bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Activity level</label>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
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
            {form.weight_kg && (
              <div className="bg-surface-dim rounded-lg p-3 text-sm text-text-muted">
                Based on NRC guidelines, {form.name}'s daily budget is ~
                <strong className="text-text">
                  {Math.round(70 * Math.pow(form.weight_kg, 0.75) * ({ low: 1.2, normal: 1.4, moderate: 1.6, high: 1.8, very_high: 2.0 }[(form.activity_level as ActivityLevel) || 'normal']))} kcal
                </strong>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2 rounded-lg border border-border text-text font-medium hover:bg-surface-dim transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-danger text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}
