import { useState } from 'react';

interface FoodInputProps {
  onSubmit: (input: string) => void;
  loading: boolean;
}

export function FoodInput({ onSubmit, loading }: FoodInputProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-surface border-b border-border">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Log food... e.g. "1 scoop of nood"'
        disabled={loading}
        className="flex-1 rounded-lg border border-border px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        autoFocus
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? '...' : 'Log'}
      </button>
    </form>
  );
}
