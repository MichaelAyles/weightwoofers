import { useState } from 'react';
import type { Clarification } from '../lib/types';

interface ClarificationFlowProps {
  clarifications: Clarification[];
  onResolve: (id: string, value: string) => void;
  loading: boolean;
}

export function ClarificationFlow({ clarifications, onResolve, loading }: ClarificationFlowProps) {
  const [inputValue, setInputValue] = useState('');

  if (clarifications.length === 0) return null;

  const current = clarifications[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;
    onResolve(current.id, inputValue.trim());
    setInputValue('');
  }

  return (
    <div className="mx-4 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <p className="text-sm text-text mb-2">{current.question}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Your answer..."
          disabled={loading}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Reply'}
        </button>
      </form>
      {clarifications.length > 1 && (
        <p className="text-xs text-text-muted mt-2">
          +{clarifications.length - 1} more question{clarifications.length > 2 ? 's' : ''} after this
        </p>
      )}
    </div>
  );
}
