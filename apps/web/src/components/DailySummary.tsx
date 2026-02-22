import type { DailySummary as DailySummaryType } from '../lib/types';

interface DailySummaryProps {
  summary: DailySummaryType | null;
}

export function DailySummary({ summary }: DailySummaryProps) {
  if (!summary) return null;

  const { total_kcal, budget_kcal, remaining_kcal, percentage } = summary;
  const clampedPct = Math.min(percentage, 100);
  const isOver = percentage > 100;

  // SVG ring dimensions
  const size = 140;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center py-6">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={isOver ? 'text-danger' : 'text-primary'}
        />
      </svg>
      <div className="-mt-[90px] mb-8 text-center">
        <p className="text-2xl font-bold text-text">{Math.round(total_kcal)}</p>
        <p className="text-xs text-text-muted">of {Math.round(budget_kcal)} kcal</p>
      </div>
      <p className={`text-sm font-medium ${isOver ? 'text-danger' : 'text-success'}`}>
        {isOver
          ? `${Math.round(total_kcal - budget_kcal)} kcal over budget`
          : `${Math.round(remaining_kcal)} kcal remaining`}
      </p>
    </div>
  );
}
