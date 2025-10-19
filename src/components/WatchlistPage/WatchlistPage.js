import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { apiClient } from '../../lib/api';
import '../../styles/WatchlistPage.css';

const WatchlistPage = ({ onMatchSelect }) => {
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.getUserWatchlist(user.id);
      setItems(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user, fetchWatchlist]);

  const handleOpen = (entry) => {
    const minimalMatch = {
      id: entry.matchId,
      homeTeam: entry.homeTeam ? { name: entry.homeTeam } : undefined,
      awayTeam: entry.awayTeam ? { name: entry.awayTeam } : undefined,
      competition: entry.competition ? { name: entry.competition } : undefined,
      utcDate: entry.utcDate || undefined,
    };
    if (onMatchSelect) onMatchSelect(minimalMatch);
  };

  const handleRemove = async (entry) => {
    if (!user) return;
    try {
      setRemovingId(entry.matchId);
      await apiClient.removeUserMatch(user.id, entry.matchId);
      setItems((prev) => prev.filter((i) => i.matchId !== entry.matchId));
    } catch (e) {
      alert('Failed to remove from watchlist');
    } finally {
      setRemovingId(null);
    }
  };

  if (!user) {
    return (
      <div className="wl-container">
        <div className="wl-empty">
          <h3>Sign in required</h3>
          <p>Please sign in to view your watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wl-container">
        <div className="wl-loading">
          <div className="wl-spinner" />
          <div>Loading watchlist…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wl-container">
        <div className="wl-error">
          <h3>Could not load watchlist</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchWatchlist}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wl-container">
      <div className="wl-header">
        <h2>Your Watchlist</h2>
        <button className="btn btn-secondary" onClick={fetchWatchlist}>Refresh</button>
      </div>
      {items.length === 0 ? (
        <div className="wl-empty">
          <p>No matches in your watchlist yet.</p>
        </div>
      ) : (
        <div className="wl-grid">
          {items.map((it) => (
            <div key={`${it.userId}-${it.matchId}`} className="wl-card">
              <div className="wl-card-top">
                <div className="wl-comp">{it.competition || '—'}</div>
                <div className="wl-date">
                  {it.utcDate ? new Date(it.utcDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                </div>
              </div>
              <div className="wl-card-mid">
                <div className="wl-team">
                  <span className="wl-team-name">{it.homeTeam || 'Home'}</span>
                </div>
                <div className="wl-vs">vs</div>
                <div className="wl-team">
                  <span className="wl-team-name">{it.awayTeam || 'Away'}</span>
                </div>
              </div>
              <div className="wl-card-actions">
                <button className="btn btn-primary" onClick={() => handleOpen(it)}>Open</button>
                <button className="btn btn-danger" disabled={removingId === it.matchId} onClick={() => handleRemove(it)}>
                  {removingId === it.matchId ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;
