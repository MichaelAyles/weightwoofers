import { useState } from 'react';
import type { Pet, Clarification } from './lib/types';
import { usePet } from './hooks/usePet';
import { useDailySummary } from './hooks/useDailySummary';
import { useLogFood } from './hooks/useLogFood';
import { useClarify } from './hooks/useClarify';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PetProfile } from './components/PetProfile';
import { FoodInput } from './components/FoodInput';
import { ClarificationFlow } from './components/ClarificationFlow';
import { DailySummary } from './components/DailySummary';
import { FoodLog } from './components/FoodLog';

export function App() {
  const { pet, setPet, loading: petLoading } = usePet();
  const { summary, refresh: refreshSummary } = useDailySummary(pet?.id ?? null);
  const { logFood, loading: logLoading, error: logError } = useLogFood(pet?.id ?? null);
  const { resolve, loading: clarifyLoading } = useClarify();
  const [clarifications, setClarifications] = useState<Clarification[]>([]);

  if (petLoading) {
    return (
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!pet) {
    return <OnboardingWizard onComplete={setPet} />;
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

  return (
    <div className="min-h-screen bg-surface-dim">
      <PetProfile pet={pet} />
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
