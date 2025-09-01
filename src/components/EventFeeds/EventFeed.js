import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import '../../styles/EventFeed.css';
const token = process.env.REACT_APP_FOOTBALL_API_TOKEN;

// TODO : need to implement API integration later(back end people)
const EventFeed = () => {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ time: '', type: 'goal', description: '', team: '', player: '' });
  const eventsContainerRef = useRef(null);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}?limit=50`);
      if (response.data.success) {
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  // Scroll to bottom when events update
  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight;
    }
  }, [events]);

  const addEvent = () => {
    if (newEvent.time && newEvent.description) {
      setEvents([...events, { 
        id: events.length + 1, 
        ...newEvent 
      }]);
      setNewEvent({ time: '', type: 'goal', description: '', team: '', player: '' });
    }
  };


  // Function to get icon based on the type of event
  const getEventIcon = (type) => {
    switch(type) {
      case 'goal': return '⚽';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔁';
      case 'match_start': return '▶️';
      case 'match_end': return '⏹️';
      case 'half_time': return '⏸️';
      case 'injury': return '🚑';
      case 'yellowred': return '🟨🟥';
      case 'penalty': return '⚽️❗';
      case 'owngoal': return '🥅❌';
      case 'foul': return '🚫'
      case 'corner': return '� corner';
      case 'freekick': return '🎯';
      case 'offside': return '🚩';
      case 'save': return '🧤';
      default: return '🔔';
    }
  };

  return (
    <div className="event-feed">
      <h2>Live Event Feed</h2>
      
    <div className="events-container" ref={eventsContainerRef}>

        {events.map(event => (
          <div key={event.id} className={`event-item ${event.type}`}>
            <div className="event-time">{event.time}</div>
            <div className="event-icon">{getEventIcon(event.type)}</div>
            <div className="event-details">
              <div className="event-description">{event.description}</div>
              {event.team && (
                <div className="event-meta">{event.team} • {event.player}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="add-event-form">
        <h3>Add New Event</h3>
        <div className="form-row">
          <input 
            type="text" 
            placeholder="Time (e.g., 23:45)" 
            value={newEvent.time}
            onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
          />
          <select 
            value={newEvent.type}
            onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
          >
            <option value="goal">Goal</option>
            <option value="yellow_card">Yellow Card</option>
            <option value="red_card">Red Card</option>
            <option value="substitution">Substitution</option>
            <option value="match_start">Match Start</option>
            <option value="half_time">Half Time</option>
            <option value="match_end">Match End</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-row">
          <input 
            type="text" 
            placeholder="Team" 
            value={newEvent.team}
            onChange={(e) => setNewEvent({...newEvent, team: e.target.value})}
          />
          <input 
            type="text" 
            placeholder="Player" 
            value={newEvent.player}
            onChange={(e) => setNewEvent({...newEvent, player: e.target.value})}
          />
        </div>
        <textarea 
          placeholder="Event description" 
          value={newEvent.description}
          onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
        />
        <button onClick={addEvent}>Add Event</button>
      </div>
    </div>
  );
};

export default EventFeed;