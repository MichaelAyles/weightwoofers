import type { Pet } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

interface AppHeaderProps {
  pets: Pet[];
  activePet: Pet | null;
  onSwitchPet: (id: string) => void;
  onNavigatePets: () => void;
}

export function AppHeader({ pets, activePet, onSwitchPet, onNavigatePets }: AppHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-text">WeightWoofers</h1>
        {pets.length > 0 && (
          <select
            value={activePet?.id ?? ''}
            onChange={(e) => onSwitchPet(e.target.value)}
            className="text-sm rounded-lg border border-border px-2 py-1 text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={onNavigatePets}
          className="text-sm text-primary hover:underline"
        >
          Manage Pets
        </button>
      </div>
      <div className="flex items-center gap-3">
        {user && <span className="text-sm text-text-muted">{user.name || user.email}</span>}
        <button
          onClick={logout}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
