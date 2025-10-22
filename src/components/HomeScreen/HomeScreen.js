import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFutbol, 
  faPeopleGroup, 
  faTrophy,  
  faNewspaper, 
  faPlayCircle,
  faFire,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "../../lib/api";

const HomeScreen = ({ setActiveTab, setSelectedLeague, leagues, latestNews, newsLoading }) => {
  const [featuredHighlights, setFeaturedHighlights] = useState([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);
  const [highlightsError, setHighlightsError] = useState(null);

  // Fetch Premier League highlights for dashboard
  useEffect(() => {
    const loadDashboardHighlights = async () => {
      setIsLoadingHighlights(true);
      setHighlightsError(null);
      try {
        const premierLeagueHighlights = await apiClient.getFootballHighlights("Premier League");
        // Take first 9 highlights for the 3x3 grid
        setFeaturedHighlights(premierLeagueHighlights?.slice(0, 9) || []);
      } catch (err) {
        console.error("❌ Error loading dashboard highlights:", err);
        setHighlightsError("Failed to load highlights");
      } finally {
        setIsLoadingHighlights(false);
      }
    };

    loadDashboardHighlights();
  }, []);

  const features = [
    { 
      title: "Live Matches", 
      description: "Follow games in real-time", 
      icon: <FontAwesomeIcon icon={faFutbol} />,
      action: () => setActiveTab('matches'),
      color: "#e63946"
    },
    { 
      title: "Players", 
      description: "Player stats and profiles", 
      icon: <FontAwesomeIcon icon={faPeopleGroup} />,
      action: () => setActiveTab('players'),
      color: "#3a86ff"
    },
    { 
      title: "Standings", 
      description: "League tables and rankings", 
      icon: <FontAwesomeIcon icon={faTrophy} />,
      action: () => setActiveTab('leagueStandings'),
      color: "#ffbe0b"
    },
    { 
      title: "Highlights", 
      description: "Match highlights & videos", 
      icon: <FontAwesomeIcon icon={faPlayCircle} />,
      action: () => setActiveTab('highlights'),
      color: "#06d6a0"
    }
  ];

  // Format views count for display
  const formatViews = (views) => {
    if (!views) return '0 views';
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  // Extract match info from title (you might want to improve this logic)
  const getMatchInfo = (title) => {
    // Simple extraction - you can enhance this based on your actual title formats
    const teams = title.split('vs').map(team => team.trim().split(' ')[0]);
    if (teams.length >= 2) {
      return `${teams[0]} vs ${teams[1]}`;
    }
    return "Match Highlights";
  };

  return (
    <div className="home-screen">
      {/* Enhanced Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <FontAwesomeIcon icon={faFire} />
            <span>Live Football Experience</span>
          </div>
          <h1>Experience Football <span className="gradient-text">Like Never Before</span></h1>
          <p>Real-time scores, in-depth statistics, and comprehensive coverage of all major leagues worldwide.</p>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column - News Only */}
        <div className="dashboard-left-column">
          {/* News Sidebar */}
          <section className="news-sidebar card-hover">
            <div className="news-header">
              <h2>
                <FontAwesomeIcon icon={faNewspaper} style={{ marginRight: '0.5rem' }} />
                Latest News
              </h2>
              <button 
                className="view-all-btn"
                onClick={() => setActiveTab('news')}
              >
                View All
              </button>
            </div>
            
            <div className="news-feed">
              {newsLoading ? (
                <div className="news-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading news...</p>
                </div>
              ) : latestNews.length > 0 ? (
                latestNews.map((article, index) => (
                  <div 
                    key={article._id || index} 
                    className="news-item card-hover"
                    onClick={() => setActiveTab('news')}
                  >
                    {article.images?.[0] && (
                      <div className="news-image">
                        <img src={article.images[0].url} alt={article.headline} />
                        <div className="news-overlay"></div>
                      </div>
                    )}
                    <div className="news-content">
                      <div className="news-category">Breaking News</div>
                      <h4>{article.headline}</h4>
                      <p className="news-excerpt">
                        {article.description?.substring(0, 100)}...
                      </p>
                      <div className="news-meta">
                        <span className="news-time">
                          {new Date(article.published).toLocaleDateString()}
                        </span>
                        <span className="read-more">Read More →</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-news">
                  <p>No recent news available</p>
                  <button 
                    className="retry-btn"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="dashboard-right-column">
          {/* Quick Actions */}
          <section className="quick-actions card-hover">
            <div className="section-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="actions-grid">
              {features.map((feature, idx) => (
                <div 
                  className="action-card card-hover" 
                  key={idx} 
                  onClick={feature.action}
                  style={{ '--card-color': feature.color }}
                >
                  <div className="action-icon" style={{ color: feature.color }}>
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="action-arrow">→</div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured Leagues */}
          <section className="featured-leagues card-hover">
            <div className="section-header">
              <h2>Featured Leagues</h2>
            </div>
            <div className="featured-leagues-grid">
              {leagues.slice(0, 6).map((league, idx) => (
                <div 
                  className="featured-league-card card-hover" 
                  key={idx}
                  onClick={() => {
                    setSelectedLeague(league.key);
                    setActiveTab('leagueStandings');
                  }}
                >
                  <div className="featured-league-inner">
                    <div className="featured-league-front">
                      <div className="featured-league-logo">
                        <img src={league.img} alt={league.name} />
                      </div>
                    </div>
                    <div 
                      className="featured-league-back" 
                      style={{ backgroundColor: league.color }}
                    >
                      <div className="featured-league-back-content">
                        <h3>{league.name}</h3>
                        <p>{league.desc}</p>
                        <button className="btn btn-small">
                          View League
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Highlights Section */}
      <section className="highlights-section card-hover">
        <div className="section-header">
          <h2>
            <FontAwesomeIcon icon={faPlayCircle} style={{ marginRight: '0.5rem' }} />
            Highlights
          </h2>
          <button 
            className="view-all-btn"
            onClick={() => setActiveTab('highlights')}
          >
            View All Highlights
          </button>
        </div>
        
        <div className="highlights-grid">
          {isLoadingHighlights ? (
            <div className="highlights-loading">
              <div className="loading-spinner"></div>
              <p>Loading Premier League highlights...</p>
            </div>
          ) : highlightsError ? (
            <div className="no-highlights">
              <p>{highlightsError}</p>
              <button 
                className="retry-btn"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : featuredHighlights.length > 0 ? (
            featuredHighlights.map((highlight, index) => (
              <div 
                key={highlight.videoId || index} 
                className="highlight-card card-hover"
                onClick={() => {
                  // You can implement modal here or navigate to highlights tab
                  setActiveTab('highlights');
                }}
              >
                <div className="highlight-thumbnail">
                  <img 
                    src={highlight.thumbnail} 
                    alt={highlight.title}
                    onError={(e) => {
                      e.target.src = '/assets/fallback-highlight.jpg'; 
                    }}
                  />
                  <div className="play-overlay">
                    <FontAwesomeIcon icon={faPlayCircle} />
                  </div>
                  <div className="highlight-duration">
                    {highlight.duration || '10:00'}
                  </div>
                </div>
                <div className="highlight-content">
                  <div className="highlight-league">Premier League</div>
                  <h4>{highlight.title}</h4>
                  <div className="highlight-meta">
                    <span className="highlight-match">
                      {getMatchInfo(highlight.title)}
                    </span>
                    <span className="highlight-views">
                      {formatViews(highlight.viewCount)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-highlights">
              <p>No highlights available at the moment</p>
              <button 
                className="retry-btn"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;
