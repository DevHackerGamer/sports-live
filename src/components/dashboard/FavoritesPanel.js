import React, { useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUserPreferences } from '../../hooks/useUserPreferences';

function normalizeTeam(name) {
  return (name || '').trim();
}

export default function FavoritesPanel() {
  const { user } = useUser();
  const userId = user?.id;
  const { prefs, loading, error, savePreferences } = useUserPreferences(userId);
  const [input, setInput] = useState('');

  const favorites = useMemo(() => {
    const list = Array.isArray(prefs?.favorites) ? prefs.favorites : [];
    const seen = new Set();
    const uniq = [];
    for (const item of list) {
      const n = normalizeTeam(item);
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        uniq.push(n);
      }
    }
    return uniq;
  }, [prefs]);

  const addFavorite = async () => {
    const name = normalizeTeam(input);
    if (!name) return;
    const next = favorites.includes(name) ? favorites : [...favorites, name];
    await savePreferences({ favorites: next });
    setInput('');
  };

  if (!userId) return null;
  if (loading) return <div data-testid="favorites-loading">Loading favorites…</div>;
  if (error) return <div data-testid="favorites-error">Failed to load favorites</div>;

  return (
    <section className="favorites-panel" style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 8 }}>Favorites</h3>
      <div className="favorites-add" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          aria-label="Favorite team"
          placeholder="Add favorite team"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ padding: '8px 10px', flex: '0 0 260px' }}
        />
        <button onClick={addFavorite} style={{ padding: '8px 12px' }}>Add</button>
      </div>
      {favorites.length === 0 ? (
        <p data-testid="favorites-empty">No favorite teams yet.</p>
      ) : (
        <ul data-testid="favorites-list" style={{ paddingLeft: 16 }}>
          {favorites.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
