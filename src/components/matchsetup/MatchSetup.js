import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import MatchViewer from '../matchViewer/MatchViewer';
import { isAdminFromUser } from '../../lib/roles';
import '../../styles/MatchSetup.css';

//Component for setting up and managing matches
// Admin-only screen for creating/scheduling matches.
const MatchSetup = ({ isAdmin: isAdminProp }) => {
  const { user } = useUser();
  const [matches, setMatches] = useState([]);
  const [teams,setTeams] = useState([]);
  const [newMatch, setNewMatch] = useState({
    teamA: {},
    teamB: {},
    date: '',
    time: '',
    competition: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [loading,setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  // fetch only admin-created matches using createdMatchs api
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/createdMatches');
        const matchData = await res.json();

        // Only upcoming matches
        const now = new Date();
        const upcomingMatches = [];

        for (let match of matchData) {
          const matchDate = new Date(`${match.date}T${match.time}`);
          if (matchDate >= now) {
            upcomingMatches.push(match);
          } else {
            // delete past matches automatically to scale db
            await fetch(`/api/createdMatches?id=${match._id}`, { method: "DELETE" });
          }
        }

        setMatches(upcomingMatches);
      } catch (err) {
        console.error("Error fetching admin-created matches:", err);
      }
    };

    fetchMatches();
  }, []);

  // fetch all teams for the dropdown input data also ensure valid teams are selected
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

  // match validation
  const validateMatch = () => {
    if(!newMatch.teamA.id || !newMatch.teamB.id || !newMatch.date || !newMatch.time){
      alert('Fill in all required fields');
      return false;
    }
    if(newMatch.teamA.id === newMatch.teamB.id){
      alert('Home and Away teams must be different');
      return false;
    }
    return true;
  }

  //Add match to the AdminCreatedMatchs collection in db
  const addMatch = async () => {
    if(!validateMatch()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/createdMatches', {
        method: 'POST',
        headers: {'Content-type':'application/json'},
        body: JSON.stringify({
          homeTeam: newMatch.teamA,
          awayTeam: newMatch.teamB,
          date: newMatch.date,
          time: newMatch.time,
          competition: { id: 'unknown', name: { en: newMatch.competition || 'Unknown Competition' } }
        })
      });
      if(!res.ok){
        const error = await res.json();
        throw new Error(error.error || 'Failed to save match');
      } else {
        const matchRes = await fetch('/api/createdMatches');
        const updatedMatches = await matchRes.json();
        setMatches(updatedMatches);
        setNewMatch({teamA:{},teamB:{},date:'',time:'',competition:''});
        setShowForm(false);
      }
    } catch(error){
      console.error('Error saving match',error);
      alert('Failed to save match, check console for details');
    } finally {
      setLoading(false);
    }
  }

  //Remove match from the AdminCreatedMatches collection in the db
  const removeMatch = async(id) => {
    if(!window.confirm('Are you sure you want to remove this match?')) return;
    try {
      const res = await fetch(`/api/createdMatches?id=${id}`, { method:'DELETE' });
      if(!res.ok){
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete match');
      }
      setMatches(matches.filter(m => m._id !== id));
    } catch(error){
      console.error('Error deleting match', error);
      alert('Could not delete match, see console for details');
    }
  };

  // Handle selecting a match to view details
  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
  };

  return (
    <div className="match-setup">
      {selectedMatch ? (
        <MatchViewer 
          match={selectedMatch} 
          initialSection="details" 
          onBack={() => setSelectedMatch(null)}
        />
      ) : (
        <>
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
                <select
                  name="teamA"
                  value={newMatch.teamA.id || ''}
                  onChange={e => {
                    const team = teams.find(t => t.id === e.target.value);
                    setNewMatch(prev => ({ ...prev, teamA: team || {} }));
                  }}
                >
                  <option value="">Select Home Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
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
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <input type="date" name="date" value={newMatch.date} onChange={handleInputChange}/>
                <input type="time" name="time" value={newMatch.time} onChange={handleInputChange}/>
              </div>
              <div className="form-row">
                <input type="text" name="competition" placeholder="Competition (e.g., Premier League)" value={newMatch.competition} onChange={handleInputChange}/>
              </div>
              <button className="btn-primary" onClick={addMatch} disabled={loading}>
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
                  key={match._id} 
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
                      <span className="competition">{match.competition?.name?.en || match.competitionName || 'Unknown Competition'}</span>
                      <span className="datetime">{match.date} at {match.time}</span>
                    </div>
                  </div>
                  <button 
                    className="btn-danger" 
                    onClick={(e) => { e.stopPropagation(); removeMatch(match._id); }}
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