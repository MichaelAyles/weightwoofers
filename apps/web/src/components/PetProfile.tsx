import type { Pet } from '../lib/types';

export function PetProfile({ pet }: { pet: Pet }) {
  const budget = pet.target_kcal_override ?? pet.calculated_mer;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
      <div>
        <h2 className="font-bold text-text">{pet.name}</h2>
        {pet.breed && <p className="text-xs text-text-muted">{pet.breed}</p>}
      </div>
      {budget && (
        <div className="text-right">
          <p className="text-sm font-medium text-text">{Math.round(budget)} kcal/day</p>
          <p className="text-xs text-text-muted">{pet.weight_kg} kg &middot; {pet.activity_level}</p>
        </div>
      )}
    </div>
  );
}
