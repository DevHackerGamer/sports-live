import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/MatchStatistics.css';

const MatchStatistics = ({ match }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatistics = useCallback(async () => {
    if (!match || !(match.id || match._id)) return;
    
    setLoading(true);
    setError('');
    
    try {
      const stats = await apiClient.getMatchStatistics(match.id || match._id);
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load match statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [match]);

  useEffect(() => {
    if (match && (match.id || match._id)) {
      loadStatistics();
    }
  }, [match, loadStatistics]);

  const homeName = match?.homeTeam?.name || match?.homeTeam || 'Home';
  const awayName = match?.awayTeam?.name || match?.awayTeam || 'Away';

  if (loading) {
    return (
      <div className="match-statistics">
        <h3>Match Statistics</h3>
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-statistics">
        <h3>Match Statistics</h3>
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="match-statistics">
        <h3>Match Statistics</h3>
        <div className="no-stats">
          <p>No statistics available for this match</p>
        </div>
      </div>
    );
  }

  // Statistics display data
  const statsData = [
    {
      label: 'Possession',
      homeValue: statistics.possession?.home || 0,
      awayValue: statistics.possession?.away || 0,
      isPercentage: true,
      showBar: true
    },
    {
      label: 'Shots on Target',
      homeValue: statistics.shotsOnTarget?.home || 0,
      awayValue: statistics.shotsOnTarget?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Shots off Target',
      homeValue: statistics.shotsOffTarget?.home || 0,
      awayValue: statistics.shotsOffTarget?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Total Shots',
      homeValue: statistics.totalShots?.home || 0,
      awayValue: statistics.totalShots?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Corners',
      homeValue: statistics.corners?.home || 0,
      awayValue: statistics.corners?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Fouls',
      homeValue: statistics.fouls?.home || 0,
      awayValue: statistics.fouls?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Yellow Cards',
      homeValue: statistics.yellowCards?.home || 0,
      awayValue: statistics.yellowCards?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Red Cards',
      homeValue: statistics.redCards?.home || 0,
      awayValue: statistics.redCards?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Offsides',
      homeValue: statistics.offsides?.home || 0,
      awayValue: statistics.offsides?.away || 0,
      isPercentage: false,
      showBar: false
    },
    {
      label: 'Saves',
      homeValue: statistics.saves?.home || 0,
      awayValue: statistics.saves?.away || 0,
      isPercentage: false,
      showBar: false
    }
  ];

  return (
    <div className="match-statistics">
      <h3>Match Statistics</h3>
      <div className="stats-container">
        {statsData.map((stat, index) => (
          <div key={index} className="stat-row">
            <div className="stat-home-value">
              {stat.homeValue}{stat.isPercentage ? '%' : ''}
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              {stat.showBar && (
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-home"
                    style={{ width: `${stat.homeValue}%` }}
                  ></div>
                  <div 
                    className="stat-bar stat-bar-away"
                    style={{ width: `${stat.awayValue}%` }}
                  ></div>
                </div>
              )}
            </div>
            <div className="stat-away-value">
              {stat.awayValue}{stat.isPercentage ? '%' : ''}
            </div>
          </div>
        ))}
      </div>
      <div className="team-labels">
        <div className="team-label-home">{homeName}</div>
        <div className="team-label-away">{awayName}</div>
      </div>
      {statistics.lastUpdated && (
        <div className="stats-timestamp">
          Last updated: {new Date(statistics.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default MatchStatistics;