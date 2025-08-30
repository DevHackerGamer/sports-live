import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { isAdminFromUser } from '../../lib/roles';
import '../../styles/MatchSetup.css';


//Component for setting up and managing matches
// Admin-only screen for creating/scheduling matches.
// Accepts optional isAdmin prop from parent; falls back to Clerk metadata if not provided.
const MatchSetup = ({ isAdmin: isAdminProp }) => {
  const { user } = useUser();
  // Declare hooks unconditionally
  const [matches, setMatches] = useState([]);
  const [newMatch, setNewMatch] = useState({
    teamA: '',
    teamB: '',
    date: '',
    time: '',
    competition: ''
  });
  const [showForm, setShowForm] = useState(false);

  // Compute role after hooks to avoid conditional hook calls
  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  if (!isAdmin) {
    return (
      <div className="match-setup">
        <h2>Match Setup</h2>
        <p style={{ color: '#b00' }}>Access denied: Admin role required.</p>
      </div>
    );
  }


  //Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMatch({ ...newMatch, [name]: value });
  };


  //Add match to the list
  const addMatch = () => {
    if (newMatch.teamA && newMatch.teamB && newMatch.date && newMatch.time) {
      setMatches([...matches, { ...newMatch, id: Date.now() }]);
      setNewMatch({ teamA: '', teamB: '', date: '', time: '', competition: '' });
      setShowForm(false);
    }
  };


  //Remove match from the list
  const removeMatch = (id) => {
    setMatches(matches.filter(match => match.id !== id));
  };

  return (
    <div className="match-setup">
      <div className="header-row">
        <h2>Match Setup</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create New Match'}
        </button>
      </div>

      {showForm && (
        <div className="match-form">
          <h3>Create New Match</h3>
          <div className="form-row">
            <input
              type="text"
              name="teamA"
              placeholder="Home Team"
              value={newMatch.teamA}
              onChange={handleInputChange}
            />
            <span className="vs">VS</span>
            <input
              type="text"
              name="teamB"
              placeholder="Away Team"
              value={newMatch.teamB}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-row">
            <input
              type="date"
              name="date"
              value={newMatch.date}
              onChange={handleInputChange}
            />
            <input
              type="time"
              name="time"
              value={newMatch.time}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              name="competition"
              placeholder="Competition (e.g., Premier League)"
              value={newMatch.competition}
              onChange={handleInputChange}
            />
          </div>
          <button className="btn-primary" onClick={addMatch}>
            Create Match
          </button>
        </div>
      )}

      <div className="matches-list">
        <h3>Scheduled Matches</h3>
        {matches.length === 0 ? (
          <p className="no-matches">No matches scheduled yet.</p>
        ) : (
          matches.map(match => (
            <div key={match.id} className="match-item">
              <div className="match-info">
                <div className="teams">
                  <span className="team">{match.teamA}</span>
                  <span className="vs">vs</span>
                  <span className="team">{match.teamB}</span>
                </div>
                <div className="match-details">
                  <span className="competition">{match.competition}</span>
                  <span className="datetime">{match.date} at {match.time}</span>
                </div>
              </div>
              <button className="btn-danger" onClick={() => removeMatch(match.id)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MatchSetup;