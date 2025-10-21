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
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingStates, setLoadingStates] = useState({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [removeConfirm, setRemoveConfirm] = useState({ show: false, match: null });

  const [newMatch, setNewMatch] = useState({
    teamA: {},
    teamB: {},
    date: '',
    time: '',
    competition: '',
    matchday: ''
  });

  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  // Clear errors when user starts typing
  const clearErrors = (field = null) => {
    if (field) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    } else {
      setErrors({});
    }
  };

  // Show success message temporarily
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Show error message
  const showError = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

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
    clearErrors(name);
  };
// Enhanced validation with detailed error messages
const validateMatch = (match) => {
  const newErrors = {};

  if (!match.teamA?.id) newErrors.teamA = 'Home team is required';
  if (!match.teamB?.id) newErrors.teamB = 'Away team is required';
  if (!match.date) newErrors.date = 'Date is required';
  if (!match.time) newErrors.time = 'Time is required';
  if (!match.competition) newErrors.competition = 'Competition is required';
  if (!match.matchday && match.matchday !== 0) newErrors.matchday = 'Matchday is required';
  
  if (match.teamA?.id && match.teamB?.id && match.teamA.id === match.teamB.id) {
    newErrors.teamB = 'Home and Away teams must be different';
  }

  // Date validation - ALLOW TODAY'S MATCHES
  if (match.date && match.time) {
    const matchDateTime = new Date(`${match.date}T${match.time}`);
    const now = new Date();
    
    // Allow matches for today and future dates
    if (matchDateTime < now) {
      // Only show error if the match time has already passed today
      const today = new Date().toDateString();
      const matchDate = new Date(match.date).toDateString();
      
      if (today === matchDate && matchDateTime < now) {
        newErrors.time = 'Match time must be in the future for today';
      } else if (today !== matchDate) {
        newErrors.date = 'Match date cannot be in the past';
      }
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// Add match (form or imported) - return promise for better import handling
const addMatch = async (matchDataParam) => {
  return new Promise(async (resolve, reject) => {
    const matchData = matchDataParam || newMatch;
    
    if (!validateMatch(matchData)) {
      reject(new Error('Validation failed'));
      return;
    }

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
      if (!res.ok || (!json.success && !json.id)) {
        throw new Error(json.error || 'Failed to save match');
      }

      const saved = json.data || json;
      setMatches(prev => prev.map(m => m.id === optimisticId ? saved : m)
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)));

      if (!matchDataParam) {
        setNewMatch({ teamA: {}, teamB: {}, date: '', time: '', competition: '', matchday: '' });
        setShowForm(false);
        setErrors({});
        showSuccess('Match created successfully!');
      }
      
      resolve(saved);
    } catch (error) {
      console.error('Error saving match', error);
      setMatches(prev => prev.filter(m => m.id !== optimisticId));
      
      if (!matchDataParam) {
        showError('Failed to save match');
      }
      
      reject(error);
    } finally {
      setLoading(false);
    }
  });
};
 // Enhanced remove match with custom modal
const removeMatch = async (id) => {
  const matchToRemove = matches.find(m => m.id === id || m._id === id);
  if (!matchToRemove) return;

  // Show custom confirmation modal
  setRemoveConfirm({
    show: true,
    match: matchToRemove
  });
};

// Handle confirmed removal
const confirmRemove = async () => {
  const { match } = removeConfirm;
  if (!match) return;

  const id = match.id || match._id;
  const prev = matches;
  
  setMatches(m => m.filter(mt => mt.id !== id && mt._id !== id));
  setRemoveConfirm({ show: false, match: null });
  
  // Set loading state for this specific match
  setLoadingStates(prev => ({ ...prev, [id]: true }));

  try {
    const res = await fetch(`/api/matches/${id}`, {
      method: 'DELETE',
      headers: { ...(isAdmin ? { 'X-User-Type': 'admin' } : {}) }
    });
    
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
    
    showSuccess('Match removed successfully!');
  } catch (err) {
    console.error('Error deleting match', err);
    showError('Failed to remove match');
    setMatches(prev);
  } finally {
    setLoadingStates(prev => ({ ...prev, [id]: false }));
  }
};

// Cancel removal
const cancelRemove = () => {
  setRemoveConfirm({ show: false, match: null });
};

  // JSON import handler
 // Enhanced JSON import handler with individual error tracking
const importMatches = async (parsed) => {
  setLoading(true);
  
  const results = {
    total: parsed.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  // Process matches sequentially to avoid race conditions
  for (let i = 0; i < parsed.length; i++) {
    const m = parsed[i];
    try {
      const teamA = teams.find(t => t.name.toLowerCase() === m.teamA.toLowerCase()) ||
                   { name: m.teamA, id: `custom_${m.teamA.replace(/\s+/g, '_')}` };
      const teamB = teams.find(t => t.name.toLowerCase() === m.teamB.toLowerCase()) ||
                   { name: m.teamB, id: `custom_${m.teamB.replace(/\s+/g, '_')}` };
      const competition = competitions.find(c => c.toLowerCase() === (m.competition || '').toLowerCase()) ||
                         m.competition;

      const matchData = { 
        teamA, 
        teamB, 
        date: m.date, 
        time: m.time, 
        competition, 
        matchday: m.matchday 
      };

      // Validate the match first
      if (!validateMatch(matchData)) {
        throw new Error('Validation failed - check required fields');
      }

      // Add the match
      await addMatch(matchData);
      results.successful++;
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        match: `${m.teamA} vs ${m.teamB}`,
        error: error.message || 'Unknown error'
      });
    }
  }

  setLoading(false);
  
  // Show detailed results
  if (results.failed === 0) {
    showSuccess(`All ${results.successful} matches imported successfully!`);
  } else if (results.successful === 0) {
    showError(`All ${results.failed} matches failed to import.`);
  } else {
    showSuccess(
      `${results.successful} matches imported, ${results.failed} failed. ` +
      `Check console for details.`
    );
  }

  // Log detailed errors to console for debugging
  if (results.errors.length > 0) {
    console.group('Match Import Errors');
    results.errors.forEach((err, index) => {
      console.error(`${index + 1}. ${err.match}: ${err.error}`);
    });
    console.groupEnd();
  }

  setShowFileImport(false);
};

  // Select match to view details
  const handleMatchSelect = (match) => setSelectedMatch(match);

  return (
    <div className="match-setup">
      {/* Toast Notifications */}
      {successMessage && (
        <div className={`toast ${successMessage.includes('Failed') ? 'error' : 'success'}`}>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}
      {/* Remove Confirmation Modal */}
{removeConfirm.show && removeConfirm.match && (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <h3>Remove Match</h3>
        <button className="modal-close" onClick={cancelRemove}>×</button>
      </div>
      
      <div className="modal-content">
        <div className="match-preview">
          <div className="preview-teams">
            <div className="preview-team home">
              <img 
                src={teamCrests[removeConfirm.match.homeTeam?.name] || teamCrests[normalize(removeConfirm.match.homeTeam?.name)] || '/placeholder.png'} 
                alt={`${removeConfirm.match.homeTeam?.name} crest`}
              />
              <span>{removeConfirm.match.homeTeam?.name || 'Home Team'}</span>
            </div>
            
            <div className="preview-vs">vs</div>
            
            <div className="preview-team away">
              <img 
                src={teamCrests[removeConfirm.match.awayTeam?.name] || teamCrests[normalize(removeConfirm.match.awayTeam?.name)] || '/placeholder.png'} 
                alt={`${removeConfirm.match.awayTeam?.name} crest`}
              />
              <span>{removeConfirm.match.awayTeam?.name || 'Away Team'}</span>
            </div>
          </div>
          
          <div className="preview-details">
            <div className="preview-detail">
              <strong>Date:</strong> {removeConfirm.match.date} {removeConfirm.match.time}
            </div>
            <div className="preview-detail">
              <strong>Competition:</strong> {removeConfirm.match.competition?.name || removeConfirm.match.competitionName || 'Unknown'}
            </div>
            {removeConfirm.match.matchday && (
              <div className="preview-detail">
                <strong>Matchday:</strong> {removeConfirm.match.matchday}
              </div>
            )}
          </div>
        </div>
        
        <p className="warning-text">This action cannot be undone. The match will be permanently removed.</p>
      </div>
      
      <div className="modal-actions">
        <button className="btn-secondary" onClick={cancelRemove}>
          Cancel
        </button>
        <button className="btn-danger" onClick={confirmRemove}>
          Remove Match
        </button>
      </div>
    </div>
  </div>
)}
      
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
            setImportProgress({ current: 0, total: parsed.length });
            importMatches(parsed);
          } catch (err) {
            showError("Invalid JSON file: " + err.message);
          }
        };
        reader.readAsText(file);
      }}
    />
    
    {/* Progress indicator */}
    {importProgress.total > 0 && (
      <div className="import-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
          ></div>
        </div>
        <div className="progress-text">
          Processing {importProgress.current} of {importProgress.total} matches...
        </div>
      </div>
    )}
  </div>
)}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <select
                    name="teamA"
                    value={newMatch.teamA.id || ''}
                    onChange={e => {
                      const team = teams.find(t => t.id === e.target.value);
                      setNewMatch(prev => ({ ...prev, teamA: team || {} }));
                      clearErrors('teamA');
                    }}
                    className={errors.teamA ? 'error' : ''}
                  >
                    <option value="">Select Home Team</option>
                    {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                  {errors.teamA && <span className="error-message">{errors.teamA}</span>}
                </div>

                <span className="vs">VS</span>

                <div className="form-field">
                  <select
                    name="teamB"
                    value={newMatch.teamB.id || ''}
                    onChange={e => {
                      const team = teams.find(t => t.id === e.target.value);
                      setNewMatch(prev => ({ ...prev, teamB: team || {} }));
                      clearErrors('teamB');
                    }}
                    className={errors.teamB ? 'error' : ''}
                  >
                    <option value="">Select Away Team</option>
                    {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                  {errors.teamB && <span className="error-message">{errors.teamB}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <input
                    type="date"
                    name="date"
                    value={newMatch.date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      handleInputChange(e);
                      clearErrors('date');
                    }}
                    className={errors.date ? 'error' : ''}
                  />
                  {errors.date && <span className="error-message">{errors.date}</span>}
                </div>
                
                <div className="form-field">
                  <input
                    type="time"
                    name="time"
                    value={newMatch.time}
                    onChange={(e) => {
                      handleInputChange(e);
                      clearErrors('time');
                    }}
                    className={errors.time ? 'error' : ''}
                  />
                  {errors.time && <span className="error-message">{errors.time}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <select 
                    name="competition" 
                    value={newMatch.competition} 
                    onChange={(e) => {
                      handleInputChange(e);
                      clearErrors('competition');
                    }}
                    className={errors.competition ? 'error' : ''}
                  >
                    <option value="">Select Competition</option>
                    {competitions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.competition && <span className="error-message">{errors.competition}</span>}
                </div>
                
                <div className="form-field">
                  <input
                    type="number"
                    name="matchday"
                    min="1"
                    placeholder="Matchday"
                    value={newMatch.matchday}
                    onChange={(e) => {
                      handleInputChange(e);
                      clearErrors('matchday');
                    }}
                    className={errors.matchday ? 'error' : ''}
                    style={{ width: '140px' }}
                  />
                  {errors.matchday && <span className="error-message">{errors.matchday}</span>}
                </div>
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
              <div className="matches-grid">
                {matches.map(match => {
                  const homeTeamName = match.homeTeam?.name?.en || match.homeTeam?.name || 'Unnamed Team';
                  const awayTeamName = match.awayTeam?.name?.en || match.awayTeam?.name || 'Unnamed Team';
                  const homeCrest = teamCrests[homeTeamName] || teamCrests[normalize(homeTeamName)] || '/placeholder.png';
                  const awayCrest = teamCrests[awayTeamName] || teamCrests[normalize(awayTeamName)] || '/placeholder.png';
                  const isRemoving = loadingStates[match.id || match._id];

                  return (
                    <div
                      key={match.id || match._id}
                      className={`match-card ${match._optimistic ? 'optimistic' : ''}`}
                      onClick={() => handleMatchSelect(match)}
                    >
                      <div className="match-header">
                        <div className="match-competition">
                          {match.competition?.name?.en || match.competition?.name || match.competitionName || 'Unknown Competition'}
                        </div>
                        <div className="match-status">
                          {match.status === 'IN_PLAY' && typeof match.minute === 'number' ? `${match.minute}'` : 'SCHEDULED'}
                        </div>
                      </div>

                     <div className="match-teams">
  <div className="team home-team">
    <img 
      className="team-crest clickable" 
      src={homeCrest} 
      alt={`${homeTeamName} crest`}
      onClick={(e) => handleTeamClick(homeTeamName, e)}
    />
    <span 
      className="team-name clickable"
      onClick={(e) => handleTeamClick(homeTeamName, e)}
    >
      {homeTeamName}
    </span>
  </div>

  <div className="match-separator">vs</div>

  <div className="team away-team">
    <img 
      className="team-crest clickable" 
      src={awayCrest} 
      alt={`${awayTeamName} crest`}
      onClick={(e) => handleTeamClick(awayTeamName, e)}
    />
    <span 
      className="team-name clickable"
      onClick={(e) => handleTeamClick(awayTeamName, e)}
    >
      {awayTeamName}
    </span>
  </div>
</div>
                      <div className="match-details">
                        <div className="match-datetime">
                          {(match.utcDate || '').substring(0, 10)} {match.time || (match.utcDate ? new Date(match.utcDate).toISOString().substring(11, 16) : '')}
                        </div>
                        {match.matchday && (
                          <div className="match-matchday">MD {match.matchday}</div>
                        )}
                      </div>

                      <div className="match-actions">
                        <button
  className={`btn-danger ${isRemoving ? 'loading' : ''}`}
  onClick={(e) => { e.stopPropagation(); removeMatch(match.id || match._id); }}
  disabled={isRemoving}
>
  {isRemoving ? 'Removing...' : 'Remove'}
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