import type { LogEntry } from '../lib/types';

interface FoodLogProps {
  entries: LogEntry[];
  budgetKcal: number;
}

export function FoodLog({ entries, budgetKcal }: FoodLogProps) {
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">No food logged today yet.</p>
        <p className="text-sm text-text-muted mt-1">Type something above to get started!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => {
        const time = new Date(entry.logged_at + 'Z').toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const pct = entry.kcal && budgetKcal > 0 ? (entry.kcal / budgetKcal) * 100 : null;

        return (
          <div key={entry.id} className="flex items-center px-4 py-3 gap-3">
            <span className="text-xs text-text-muted w-12 shrink-0">{time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">{entry.raw_input}</p>
              {entry.quantity && entry.unit && (
                <p className="text-xs text-text-muted">
                  {entry.quantity} {entry.unit}
                  {entry.weight_g != null && ` · ${Math.round(entry.weight_g)}g`}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              {entry.kcal != null ? (
                <>
                  <p className="text-sm font-medium text-text">{Math.round(entry.kcal)} kcal</p>
                  {pct != null && (
                    <p className="text-xs text-text-muted">{Math.round(pct)}% of budget</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-muted italic">kcal pending</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
