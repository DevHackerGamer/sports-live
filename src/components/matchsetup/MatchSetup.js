import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import MatchViewer from '../matchViewer/MatchViewer';
import { isAdminFromUser } from '../../lib/roles';
import '../../styles/MatchSetup.css';

const normalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
};

// Admin-only screen for creating/scheduling matches.
const MatchSetup = ({ isAdmin: isAdminProp, onTeamSelect }) => {
  const { user } = useUser();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFileImport, setShowFileImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [teamCrests, setTeamCrests] = useState({});

  const [newMatch, setNewMatch] = useState({
    teamA: {},
    teamB: {},
    date: '',
    time: '',
    competition: '',
    matchday: ''
  });

  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  // Fetch teams and their crests
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (!res.ok) throw new Error('Failed to fetch teams');
        const json = await res.json();
        const teamsData = json.data.map(t => ({
          id: t._id || t.id,
          name: typeof t.name === 'string' ? t.name : t.name?.en || 'Unnamed Team',
          crest: t.crest || t.logo || '/placeholder.png'
        }));
        setTeams(teamsData);

        // Build crest map
        const crestMap = {};
        teamsData.forEach(team => {
          crestMap[team.name] = team.crest;
          crestMap[normalize(team.name)] = team.crest;
        });
        setTeamCrests(crestMap);
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchTeams();
  }, []);

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

  // Handle team click
  const handleTeamClick = (teamName, event) => {
    event.stopPropagation();
    if (onTeamSelect && teamName) {
      const teamData = {
        name: teamName,
        crest: teamCrests[teamName] || teamCrests[normalize(teamName)] || '/placeholder.png'
      };
      onTeamSelect(teamData);
    }
  };

  if (!isAdmin) {
    return (
      <div className="ms-container">
        <h2>Match Setup</h2>
        <p className="ms-access-denied">Access denied: Admin role required.</p>
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
      homeTeam: { 
        name: matchData.teamA.name, 
        id: matchData.teamA.id,
        crest: teamCrests[matchData.teamA.name] || teamCrests[normalize(matchData.teamA.name)] || '/placeholder.png'
      },
      awayTeam: { 
        name: matchData.teamB.name, 
        id: matchData.teamB.id,
        crest: teamCrests[matchData.teamB.name] || teamCrests[normalize(matchData.teamB.name)] || '/placeholder.png'
      },
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
    <div className="ms-container">
      {selectedMatch ? (
        <MatchViewer match={selectedMatch} initialSection="details" onBack={() => setSelectedMatch(null)} />
      ) : (
        <>
          <div className="ms-header">
            <h2>Match Setup</h2>
            <button className="ms-btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Close Form' : 'Create Match'}
            </button>
          </div>

          {showForm && (
            <div className="ms-form">
              <h3>Create New Match</h3>

              <div className="ms-bulk-import">
                <button className="ms-btn-secondary" onClick={() => setShowFileImport(!showFileImport)}>
                  {showFileImport ? 'Close File Import' : 'Import Matches from JSON File'}
                </button>

                {showFileImport && (
                  <div className="ms-file-import">
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

              <div className="ms-form-row">
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

                <span className="ms-vs">VS</span>

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

              <div className="ms-form-row">
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

              <div className="ms-form-row">
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
                  className="ms-matchday-input"
                />
              </div>

              <button className="ms-btn-primary" onClick={() => addMatch()} disabled={loading}>
                {loading ? 'Saving...' : 'Create Match'}
              </button>
            </div>
          )}

          <div className="ms-matches-section">
            <h3>Scheduled Matches</h3>
            {matches.length === 0 ? (
              <p className="ms-no-matches">No matches scheduled yet.</p>
            ) : (
              <div className="ms-matches-grid">
                {matches.map(match => {
                  const homeTeamName = match.homeTeam?.name?.en || match.homeTeam?.name || 'Unnamed Team';
                  const awayTeamName = match.awayTeam?.name?.en || match.awayTeam?.name || 'Unnamed Team';
                  const homeCrest = teamCrests[homeTeamName] || teamCrests[normalize(homeTeamName)] || '/placeholder.png';
                  const awayCrest = teamCrests[awayTeamName] || teamCrests[normalize(awayTeamName)] || '/placeholder.png';

                  return (
                    <div
                      key={match.id || match._id}
                      className="ms-match-card"
                      onClick={() => handleMatchSelect(match)}
                    >
                      <div className="ms-match-header">
                        <div className="ms-competition">
                          {match.competition?.name?.en || match.competition?.name || match.competitionName || 'Unknown Competition'}
                        </div>
                        <div className={`ms-status-badge ${match.status === 'IN_PLAY' ? 'ms-status-live' : 'ms-status-scheduled'}`}>
                          {match.status === 'IN_PLAY' && typeof match.minute === 'number' ? `${match.minute}'` : 'SCHEDULED'}
                        </div>
                      </div>

                      <div className="ms-match-teams">
                        <div className="ms-team ms-home-team">
                          <img 
                            className="ms-team-crest ms-clickable" 
                            src={homeCrest} 
                            alt={`${homeTeamName} crest`}
                            onClick={(e) => handleTeamClick(homeTeamName, e)}
                          />
                          <span 
                            className="ms-team-name ms-clickable"
                            onClick={(e) => handleTeamClick(homeTeamName, e)}
                          >
                            {homeTeamName}
                          </span>
                        </div>

                        <div className="ms-match-separator">vs</div>

                        <div className="ms-team ms-away-team">
                          <img 
                            className="ms-team-crest ms-clickable" 
                            src={awayCrest} 
                            alt={`${awayTeamName} crest`}
                            onClick={(e) => handleTeamClick(awayTeamName, e)}
                          />
                          <span 
                            className="ms-team-name ms-clickable"
                            onClick={(e) => handleTeamClick(awayTeamName, e)}
                          >
                            {awayTeamName}
                          </span>
                        </div>
                      </div>

                      <div className="ms-card-divider"></div>

                      <div className="ms-match-details">
                        <div className="ms-meta-left">
                          <div className="ms-scheduled-time">
                            {(match.utcDate || '').substring(0, 10)} {match.time || (match.utcDate ? new Date(match.utcDate).toISOString().substring(11, 16) : '')}
                          </div>
                          {match.matchday && (
                            <div className="ms-matchday">MD {match.matchday}</div>
                          )}
                        </div>
                        <button
                          className="ms-remove-btn"
                          onClick={(e) => { e.stopPropagation(); removeMatch(match.id || match._id); }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchSetup;
