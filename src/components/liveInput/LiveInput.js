import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { isAdminFromUser } from '../../lib/roles';
import '../../styles/LiveInput.css';

// Admin-only screen for entering live match data.
// Accepts optional isAdmin prop from parent; falls back to Clerk metadata if not provided.
const LiveInput = ({ isAdmin: isAdminProp }) => {
  const { user } = useUser();

  // All hooks must be declared unconditionally and in the same order on every render.
  const [isPaused, setIsPaused] = useState(true);
  const [matchTime, setMatchTime] = useState(0); // time in seconds
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [possession, setPossession] = useState(50);
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    type: 'goal',
    team: 'home',
    player: '',
    minute: '0',
    description: ''
  });
  const timerRef = useRef(null);

  // Derive admin after hooks are declared to avoid conditional hooks.
  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminFromUser(user);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update the minute field when matchTime changes
  useEffect(() => {
    const minutes = Math.floor(matchTime / 60);
    setNewEvent(prev => ({...prev, minute: minutes.toString()}));
  }, [matchTime]);

  // Start/stop the timer since its a live match input
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setMatchTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  const handleEventAdd = () => {
    if (newEvent.player) {
      const event = {
        id: Date.now(),
        type: newEvent.type,
        team: newEvent.team,
        player: newEvent.player,
        minute: Math.floor(matchTime / 60), // Always use current match time
        description: newEvent.description,
        timestamp: new Date()
      };
      
      //prev : setEvents([...events, event]);
      setEvents([...events, { ...event, id: Date.now() }]); //now to update local state
      
      // Update score if it's a goal
      if (newEvent.type === 'goal') {
        setScore(prev => ({
          ...prev,
          [newEvent.team]: prev[newEvent.team] + 1
        }));
      }
      
      // Reset form but keep type and team
      setNewEvent({
        ...newEvent,
        player: '',
        description: ''
      });
    }
  };

  const removeEvent = (id) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const resetTimer = () => {
    setIsPaused(true);
    setMatchTime(0);
  };

  if (!isAdmin) {
    return (
      <div className="live-input">
        <h2>Live Match Input</h2>
        <p style={{ color: '#b00' }}>Access denied: Admin role required.</p>
      </div>
    );
  }

  return (
    <div className="live-input">
      <h2>Live Match Input</h2>
      
      <div className="match-controls">
        <div className="time-control">
          <label>Match Time:</label>
          <div className="time-display">{formatTime(matchTime)}</div>
          <div className="timer-controls">
            <button className="timer-btn start-btn" onClick={togglePause}>
              {isPaused ? 'Start' : 'Pause'}
            </button>
            <button className="timer-btn reset-btn" onClick={resetTimer}>
              Reset
            </button>
          </div>
        </div>
        
        <div className="score-control">
          <label>Score:</label>
          <div className="score-inputs">
            <input 
              type="number" 
              min="0" 
              value={score.home} 
              onChange={(e) => setScore({...score, home: parseInt(e.target.value) || 0})}
            />
            <span>:</span>
            <input 
              type="number" 
              min="0" 
              value={score.away} 
              onChange={(e) => setScore({...score, away: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>
        
        <div className="possession-control">
          <label>Possession (%):</label>
          <div className="possession-slider">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={possession} 
              onChange={(e) => setPossession(parseInt(e.target.value))}
            />
            <div className="possession-values">
              <span>Home: {possession}%</span>
              <span>Away: {100 - possession}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="event-input">
        <h3>Add Match Event</h3>
        <div className="event-form">
          <div className="form-row">
            <select 
              value={newEvent.type}
              onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
            >
              <option value="goal">Goal</option>
              <option value="yellow">Yellow Card</option>
              <option value="red">Red Card</option>
              <option value="substitution">Substitution</option>
              <option value="injury">Injury</option>
              <option value="yellowred">Yellow-Red Card</option>
              <option value="penalty">Penalty</option>
              <option value="owngoal">Own Goal</option>
              <option value="foul">Foul</option>
              <option value="corner">Corner</option>
              <option value="freekick">Free Kick</option>
              <option value="offside">Offside</option>
              <option value="save">Save</option>
              <option value="other">Other</option>
            </select>
            
            <select 
              value={newEvent.team}
              onChange={(e) => setNewEvent({...newEvent, team: e.target.value})}
            >
              <option value="home">Home Team</option>
              <option value="away">Away Team</option>
            </select>
            
            <div className="minute-display">
              Minute: {Math.floor(matchTime / 60)}
            </div>
          </div>
          
          <div className="form-row">
            <input 
              type="text" 
              placeholder="Player Name" 
              value={newEvent.player}
              onChange={(e) => setNewEvent({...newEvent, player: e.target.value})}
            />
          </div>
          
          <textarea 
            placeholder="Event description" 
            value={newEvent.description}
            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
          />
          
          <button onClick={handleEventAdd}>Add Event</button>
        </div>
      </div>
      
      <div className="events-log">
        <h3>Events Timeline</h3>
        {events.length === 0 ? (
          <p className="no-events">No events recorded yet.</p>
        ) : (
          events.map(event => (
            <div key={event.id} className={`event-log-item ${event.type}`}>
              <span className="event-time">{event.minute}'</span>
              <span className="event-type">
                {event.type === 'goal' && '⚽'}
                {event.type === 'yellow' && '🟨'}
                {event.type === 'red' && '🟥'}
                {event.type === 'substitution' && '🔁'}
                {event.type === 'injury' && '🤕'}
                {event.type === 'yellowred' && '🟨🟥'}
                {event.type === 'penalty' && '⚽ (P)'}
                {event.type === 'owngoal' && '⚽ (OG)'}
                {event.type === 'foul' && '🚫'}
                {event.type === 'corner' && '� corner'}
                {event.type === 'freekick' && '🎯'}
                {event.type === 'offside' && '🚩'}
                {event.type === 'save' && '🧤 '}
                {event.type === 'other' && '🔔'}
              </span>
              <span className="event-details">
                {event.team === 'home' ? 'Home' : 'Away'} - {event.player}: {event.description}
              </span>
              <button className="remove-btn" onClick={() => removeEvent(event.id)}>×</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveInput;