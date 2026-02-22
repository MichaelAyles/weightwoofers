import { useState } from 'react';
import type { Pet, Clarification } from '../lib/types';
import { useDailySummary } from '../hooks/useDailySummary';
import { useLogFood } from '../hooks/useLogFood';
import { useClarify } from '../hooks/useClarify';
import { usePets } from '../hooks/usePets';
import { useActivePet } from '../hooks/useActivePet';
import { OnboardingWizard } from './OnboardingWizard';
import { AppHeader } from './AppHeader';
import { FoodInput } from './FoodInput';
import { ClarificationFlow } from './ClarificationFlow';
import { DailySummary } from './DailySummary';
import { FoodLog } from './FoodLog';

interface DashboardProps {
  onNavigatePets: () => void;
  onNavigateAdmin?: () => void;
}

export function Dashboard({ onNavigatePets, onNavigateAdmin }: DashboardProps) {
  const { pets, loading: petsLoading, refresh: refreshPets } = usePets();
  const { activePet, setActivePet } = useActivePet(pets);
  const { summary, refresh: refreshSummary } = useDailySummary(activePet?.id ?? null);
  const { logFood, loading: logLoading, error: logError } = useLogFood(activePet?.id ?? null);
  const { resolve, loading: clarifyLoading } = useClarify();
  const [clarifications, setClarifications] = useState<Clarification[]>([]);

  if (petsLoading) {
    return (
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <OnboardingWizard
        onComplete={() => refreshPets()}
      />
    );
  }

  async function handleLog(input: string) {
    const res = await logFood(input);
    if (res) {
      setClarifications(res.clarifications);
      refreshSummary();
    }
  }

  async function handleClarify(id: string, value: string) {
    const res = await resolve(id, value);
    if (res) {
      setClarifications(res.remaining);
      refreshSummary();
    }
  }

  const budget = activePet
    ? activePet.target_kcal_override ?? activePet.calculated_mer
    : null;

  return (
    <div className="min-h-screen bg-surface-dim">
      <AppHeader
        pets={pets}
        activePet={activePet}
        onSwitchPet={setActivePet}
        onNavigatePets={onNavigatePets}
        onNavigateAdmin={onNavigateAdmin}
      />
      {activePet && budget && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
          <div>
            <span className="text-sm text-text-muted">{activePet.breed || ''}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-text">{Math.round(budget)} kcal/day</p>
            <p className="text-xs text-text-muted">{activePet.weight_kg} kg &middot; {activePet.activity_level}</p>
          </div>
        </div>
      )}
      <FoodInput onSubmit={handleLog} loading={logLoading} />
      {logError && (
        <div className="mx-4 mt-2 p-2 bg-danger/10 text-danger text-sm rounded-lg">{logError}</div>
      )}
      <ClarificationFlow
        clarifications={clarifications}
        onResolve={handleClarify}
        loading={clarifyLoading}
      />
      <DailySummary summary={summary} />
      <div className="max-w-md mx-auto">
        <FoodLog
          entries={summary?.entries_today ?? []}
          budgetKcal={summary?.budget_kcal ?? 0}
        />
      </div>
    </div>
  );
}
