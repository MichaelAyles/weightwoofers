import { useEffect } from 'react';
import { useDailySummary } from '../hooks/useDailySummary';
import { useChat } from '../hooks/useChat';
import { usePets } from '../hooks/usePets';
import { useActivePet } from '../hooks/useActivePet';
import { OnboardingWizard } from './OnboardingWizard';
import { AppHeader } from './AppHeader';
import { FoodInput } from './FoodInput';
import { ChatFlow } from './ChatFlow';
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
  const {
    messages,
    sessionActive,
    loading: chatLoading,
    error: chatError,
    dailySummary: chatSummary,
    sendMessage,
    clearSession,
  } = useChat(activePet?.id ?? null);

  // When chat returns a daily summary, refresh the canonical summary too
  useEffect(() => {
    if (chatSummary) {
      refreshSummary();
    }
  }, [chatSummary]);

  // Clear chat session when switching pets
  useEffect(() => {
    clearSession();
  }, [activePet?.id]);

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

  async function handleSubmit(input: string) {
    await sendMessage(input);
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
      <FoodInput
        onSubmit={handleSubmit}
        loading={chatLoading}
        placeholder={sessionActive ? 'Reply...' : undefined}
      />
      {chatError && (
        <div className="mx-4 mt-2 p-2 bg-danger/10 text-danger text-sm rounded-lg">{chatError}</div>
      )}
      <ChatFlow messages={messages} loading={chatLoading} />
      <DailySummary summary={chatSummary ?? summary} />
      <div className="max-w-md mx-auto">
        <FoodLog
          entries={(chatSummary ?? summary)?.entries_today ?? []}
          budgetKcal={(chatSummary ?? summary)?.budget_kcal ?? 0}
        />
      </div>
    </div>
  );
}
