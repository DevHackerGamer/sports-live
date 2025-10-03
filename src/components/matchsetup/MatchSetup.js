import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import MatchViewer from '../matchViewer/MatchViewer';
import { isAdminFromUser } from '../../lib/roles';
import '../../styles/MatchSetup.css';

// Admin-only screen for creating/scheduling matches.
const MatchSetup = ({ isAdmin: isAdminProp }) => {
  const { user } = useUser();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFileImport, setShowFileImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [newMatch, setNewMatch] = useState({
    teamA: {},
    teamB: {},
    date: '',
    time: '',
    competition: '',
    matchday: ''
  });

  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  // Fetch admin-created matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches?limit=500&range=30&includePast=1');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load matches');

        const now = new Date();
        const cutoffPast = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const upcoming = (json.data || [])
          .filter(m => m.createdByAdmin)
          .filter(m => {
            const start = new Date(m.utcDate || `${m.date}T${m.time}`);
            return start >= cutoffPast;
          })
          .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

        setMatches(upcoming);
      } catch (err) {
        console.error('Error fetching admin-created matches:', err);
      }
    };
    fetchMatches();
  }, []);

  // Live IN_PLAY minute updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(ms => ms.map(m => {
        if (m.createdByAdmin && m.status === 'IN_PLAY' && m.utcDate) {
          const diffMin = Math.floor((Date.now() - Date.parse(m.utcDate)) / 60000);
          if (diffMin >= 0 && diffMin <= 90) {
            const minute = Math.max(1, diffMin + 1);
            if (minute !== m.minute) return { ...m, minute };
          }
        }
        return m;
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (!res.ok) throw new Error('Failed to fetch teams');
        const json = await res.json();
        setTeams(json.data.map(t => ({
          id: t._id || t.id,
          name: typeof t.name === 'string' ? t.name : t.name?.en || 'Unnamed Team'
        })));
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchTeams();
  }, []);

  // Fetch competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const res = await fetch('/api/competitions');
        if (!res.ok) throw new Error('Failed to fetch competitions');
        const json = await res.json();
        if (json.success) setCompetitions(json.data);
      } catch (err) {
        console.error('Error fetching competitions:', err);
      }
    };
    fetchCompetitions();
  }, []);

  if (!isAdmin) {
    return (
      <div className="match-setup">
        <h2>Match Setup</h2>
        <p style={{ color: '#b00' }}>Access denied: Admin role required.</p>
      </div>
    );
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMatch(prev => ({ ...prev, [name]: value }));
  };

  // Validate a match (works for form & imported matches)
  const validateMatch = (match) => {
    if (!match.teamA?.id || !match.teamB?.id || !match.date || !match.time) {
      alert('Fill in all required fields');
      return false;
    }
    if (!match.competition || match.competition === '') {
      alert('Select a valid competition');
      return false;
    }
    if (match.matchday === undefined || match.matchday === null || match.matchday === '') {
      alert('Fill in all required fields');
      return false;
    }
    if (match.teamA.id === match.teamB.id) {
      alert('Home and Away teams must be different');
      return false;
    }
    return true;
  };

  // Add match (form or imported)
  const addMatch = async (matchDataParam) => {
    const matchData = matchDataParam || newMatch;
    if (!validateMatch(matchData)) return;

    setLoading(true);
    const optimisticId = `temp_${Date.now()}`;
    const localStart = new Date(`${matchData.date}T${matchData.time}`);
    const utcDate = new Date(localStart.getTime() - localStart.getTimezoneOffset() * 60000).toISOString();

    const optimisticMatch = {
      id: optimisticId,
      homeTeam: { name: matchData.teamA.name, id: matchData.teamA.id },
      awayTeam: { name: matchData.teamB.name, id: matchData.teamB.id },
      competition: { name: matchData.competition || 'Unknown Competition' },
      utcDate,
      date: matchData.date,
      time: matchData.time,
      status: 'TIMED',
      matchday: matchData.matchday ? Number(matchData.matchday) : undefined,
      createdByAdmin: true,
      _optimistic: true
    };

    setMatches(prev => [...prev, optimisticMatch].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)));

    try {
      const codeMatch = /^(.*)\s*\[([A-Za-z0-9]+)\]$/.exec(matchData.competition || '');
      const compPayload = codeMatch ? codeMatch[1].trim() : matchData.competition;
      const compCode = codeMatch ? codeMatch[2].trim() : undefined;

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(isAdmin ? { 'X-User-Type': 'admin' } : {}) },
        body: JSON.stringify({
          homeTeam: matchData.teamA,
          awayTeam: matchData.teamB,
          date: matchData.date,
          time: matchData.time,
          competition: compPayload,
          competitionCode: compCode,
          matchday: matchData.matchday ? Number(matchData.matchday) : undefined
        })
      });

      const json = await res.json();
      if (!res.ok || (!json.success && !json.id)) throw new Error(json.error || 'Failed to save match');

      const saved = json.data || json;
      setMatches(prev => prev.map(m => m.id === optimisticId ? saved : m)
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)));

      if (!matchDataParam) {
        setNewMatch({ teamA: {}, teamB: {}, date: '', time: '', competition: '', matchday: '' });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error saving match', error);
      alert('Failed to save match, reverting');
      setMatches(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setLoading(false);
    }
  };

  // Remove match
  const removeMatch = async (id) => {
    if (!window.confirm('Remove this match?')) return;
    const prev = matches;
    setMatches(m => m.filter(mt => mt.id !== id && mt._id !== id));

    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'DELETE',
        headers: { ...(isAdmin ? { 'X-User-Type': 'admin' } : {}) }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
    } catch (err) {
      console.error('Error deleting match', err);
      alert('Could not delete match; restoring');
      setMatches(prev);
    }
  };

  // JSON import handler
  const importMatches = async (parsed) => {
    const promises = parsed.map(m => {
      const teamA = teams.find(t => t.name.toLowerCase() === m.teamA.toLowerCase())
        || { name: m.teamA, id: `custom_${m.teamA.replace(/\s+/g, '_')}` };
      const teamB = teams.find(t => t.name.toLowerCase() === m.teamB.toLowerCase())
        || { name: m.teamB, id: `custom_${m.teamB.replace(/\s+/g, '_')}` };
      const competition = competitions.find(c => c.toLowerCase() === (m.competition || '').toLowerCase())
        || m.competition;

      const matchData = { teamA, teamB, date: m.date, time: m.time, competition, matchday: m.matchday };
      return addMatch(matchData);
    });

    await Promise.all(promises);
    alert(`${parsed.length} matches imported successfully!`);
    setShowFileImport(false);
  };

  // Select match to view details
  const handleMatchSelect = (match) => setSelectedMatch(match);

  return (
    <div className="match-setup">
      {selectedMatch ? (
        <MatchViewer match={selectedMatch} initialSection="details" onBack={() => setSelectedMatch(null)} />
      ) : (
        <>
          <div className="header-row">
            <h2>Match Setup</h2>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Close Form' : 'Create Match'}
            </button>
          </div>

          {showForm && (
            <div className="match-form">
              <h3>Create New Match</h3>

              <div className="bulk-import">
                <button className="btn-secondary" onClick={() => setShowFileImport(!showFileImport)}>
                  {showFileImport ? 'Close File Import' : 'Import Matches from JSON File'}
                </button>

                {showFileImport && (
                  <div className="file-import-panel">
                    <h3>Upload JSON File</h3>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const parsed = JSON.parse(ev.target.result);
                            if (!Array.isArray(parsed)) throw new Error("JSON must be an array of matches");
                            importMatches(parsed);
                          } catch (err) {
                            alert("Invalid JSON file: " + err.message);
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <select
                  name="teamA"
                  value={newMatch.teamA.id || ''}
                  onChange={e => {
                    const team = teams.find(t => t.id === e.target.value);
                    setNewMatch(prev => ({ ...prev, teamA: team || {} }));
                  }}
                >
                  <option value="">Select Home Team</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>

                <span className="vs">VS</span>

                <select
                  name="teamB"
                  value={newMatch.teamB.id || ''}
                  onChange={e => {
                    const team = teams.find(t => t.id === e.target.value);
                    setNewMatch(prev => ({ ...prev, teamB: team || {} }));
                  }}
                >
                  <option value="">Select Away Team</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>

              <div className="form-row">
                <input
                  type="date"
                  name="date"
                  value={newMatch.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={handleInputChange}
                />
                <input
                  type="time"
                  name="time"
                  value={newMatch.time}
                  min={newMatch.date === new Date().toISOString().slice(0, 10)
                    ? new Date().toISOString().substring(11, 16)
                    : "00:00"}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <select name="competition" value={newMatch.competition} onChange={handleInputChange}>
                  <option value="">Select Competition</option>
                  {competitions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="number"
                  name="matchday"
                  min="1"
                  placeholder="Matchday"
                  value={newMatch.matchday}
                  onChange={handleInputChange}
                  style={{ width: '140px' }}
                />
              </div>

              <button className="btn-primary" onClick={() => addMatch()} disabled={loading}>
                {loading ? 'Saving...' : 'Create Match'}
              </button>
            </div>
          )}

          <div className="matches-list">
            <h3>Scheduled Matches</h3>
            {matches.length === 0 ? (
              <p className="no-matches">No matches scheduled yet.</p>
            ) : (
              matches.map(match => (
                <div
                  key={match.id || match._id}
                  className="match-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleMatchSelect(match)}
                >
                  <div className="match-info">
                    <div className="teams">
                      <span className="team">{match.homeTeam?.name?.en || match.homeTeam?.name || 'Unnamed Team'}</span>
                      <span className="vs">vs</span>
                      <span className="team">{match.awayTeam?.name?.en || match.awayTeam?.name || 'Unnamed Team'}</span>
                    </div>
                    <div className="match-details">
                      <span className="competition">{match.competition?.name?.en || match.competition?.name || match.competitionName || 'Unknown Competition'}</span>
                      <span className="datetime">
                        {(match.utcDate || '').substring(0, 10)} {match.time || (match.utcDate ? new Date(match.utcDate).toISOString().substring(11, 16) : '')}
                        {match.status === 'IN_PLAY' && typeof match.minute === 'number' ? ` | ${match.minute}'` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-danger"
                    onClick={(e) => { e.stopPropagation(); removeMatch(match.id || match._id); }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchSetup;
