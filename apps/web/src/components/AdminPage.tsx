import { useState } from 'react';
import { useAdminUsers, useAdminKeys, useAdminPets, useAdminFoods } from '../hooks/useAdmin';

type Tab = 'users' | 'keys' | 'pets' | 'foods';

interface AdminPageProps {
  onBack: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>('users');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'keys', label: 'API Keys' },
    { key: 'pets', label: 'Pets' },
    { key: 'foods', label: 'Foods' },
  ];

  return (
    <div className="min-h-screen bg-surface-dim">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text">Admin Panel</h1>
          <button onClick={onBack} className="text-sm text-primary hover:underline">
            Back to Dashboard
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'keys' && <KeysTab />}
        {tab === 'pets' && <PetsTab />}
        {tab === 'foods' && <FoodsTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const { users, loading, updateUser, deleteUser } = useAdminUsers();

  if (loading) return <p className="text-text-muted">Loading users...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Pets</th>
            <th className="px-4 py-3">Admin</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border bg-surface">
              <td className="px-4 py-3 text-text">{u.email}</td>
              <td className="px-4 py-3 text-text">{u.name || '—'}</td>
              <td className="px-4 py-3 text-text">{u.pet_count}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => updateUser(u.id, { is_admin: u.is_admin ? 0 : 1 })}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    u.is_admin ? 'bg-primary/20 text-primary' : 'bg-surface-dim text-text-muted'
                  }`}
                >
                  {u.is_admin ? 'Yes' : 'No'}
                </button>
              </td>
              <td className="px-4 py-3 text-text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => {
                    if (confirm(`Delete user ${u.email} and all their data?`)) deleteUser(u.id);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p className="text-text-muted text-center py-8">No users found.</p>}
    </div>
  );
}

function KeysTab() {
  const { keys, loading, createKey, updateKey, deleteKey } = useAdminKeys();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [provider, setProvider] = useState('openrouter');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createKey({ name, key_value: keyValue, provider });
    setName('');
    setKeyValue('');
    setProvider('openrouter');
    setShowForm(false);
  }

  if (loading) return <p className="text-text-muted">Loading API keys...</p>;

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Key'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-surface rounded-lg border border-border space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Production OpenRouter"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">API Key</label>
            <input
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              required
              type="password"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="sk-or-..."
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Provider</label>
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90">
            Save Key
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-border bg-surface">
                <td className="px-4 py-3 text-text">{k.name}</td>
                <td className="px-4 py-3 text-text">{k.provider}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updateKey(k.id, { is_active: k.is_active ? 0 : 1 })}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      k.is_active ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {k.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-text-muted">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      if (confirm(`Delete API key "${k.name}"?`)) deleteKey(k.id);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && <p className="text-text-muted text-center py-8">No API keys configured.</p>}
      </div>
    </div>
  );
}

function PetsTab() {
  const { pets, loading, deletePet } = useAdminPets();

  if (loading) return <p className="text-text-muted">Loading pets...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Breed</th>
            <th className="px-4 py-3">Weight (kg)</th>
            <th className="px-4 py-3">MER</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pets.map((p) => (
            <tr key={p.id} className="border-b border-border bg-surface">
              <td className="px-4 py-3 text-text">{p.name}</td>
              <td className="px-4 py-3 text-text-muted">{(p as any).owner_email}</td>
              <td className="px-4 py-3 text-text">{p.breed || '—'}</td>
              <td className="px-4 py-3 text-text">{p.weight_kg ?? '—'}</td>
              <td className="px-4 py-3 text-text">{p.calculated_mer ? Math.round(p.calculated_mer) : '—'}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => {
                    if (confirm(`Delete pet "${p.name}" and all its log entries?`)) deletePet(p.id);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pets.length === 0 && <p className="text-text-muted text-center py-8">No pets found.</p>}
    </div>
  );
}

function FoodsTab() {
  const { foods, loading, deleteFood } = useAdminFoods();

  if (loading) return <p className="text-text-muted">Loading foods...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">kcal/100g</th>
            <th className="px-4 py-3">Completeness</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {foods.map((f) => (
            <tr key={f.id} className="border-b border-border bg-surface">
              <td className="px-4 py-3 text-text">{f.canonical_name}</td>
              <td className="px-4 py-3 text-text-muted">{(f as any).owner_email}</td>
              <td className="px-4 py-3 text-text">{f.brand || '—'}</td>
              <td className="px-4 py-3 text-text">{f.kcal_per_100g ?? '—'}</td>
              <td className="px-4 py-3 text-text">
                {f.completeness_score != null ? `${Math.round(f.completeness_score * 100)}%` : '—'}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => {
                    if (confirm(`Delete food "${f.canonical_name}"?`)) deleteFood(f.id);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {foods.length === 0 && <p className="text-text-muted text-center py-8">No foods found.</p>}
    </div>
  );
}
