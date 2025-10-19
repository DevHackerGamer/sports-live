import React from 'react';

const HomeScreen = ({ setActiveTab, setSelectedLeague, leagues, latestNews, newsLoading }) => {
  const features = [
    { 
      title: "Live Matches", 
      description: "Follow games in real-time", 
      icon: "⚽",
      action: () => setActiveTab('matches')
    },
    { 
      title: "Players", 
      description: "Player stats and profiles", 
      icon: "👤",
      action: () => setActiveTab('players')
    },
    { 
      title: "Standings", 
      description: "League tables and rankings", 
      icon: "🏆",
      action: () => setActiveTab('leagueStandings')
    },
    { 
      title: "Favorites", 
      description: "Your followed content", 
      icon: "❤️",
      action: () => setActiveTab('favorites')
    }
  ];

  return (
    <div className="home-screen">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Experience Football <span>Like Never Before</span></h1>
          <p>Real-time scores, in-depth statistics, and coverage of all major leagues.</p>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* News Sidebar - Left */}
        <section className="news-sidebar">
          <div className="news-header">
            <h2>Latest News</h2>
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
                  className="news-item"
                  onClick={() => setActiveTab('news')}
                >
                  {article.images?.[0] && (
                    <div className="news-image">
                      <img src={article.images[0].url} alt={article.headline} />
                    </div>
                  )}
                  <div className="news-content">
                    <h4>{article.headline}</h4>
                    <p className="news-excerpt">
                      {article.description?.substring(0, 100)}...
                    </p>
                    <div className="news-meta">
                      <span className="news-time">
                        {new Date(article.published).toLocaleDateString()}
                      </span>
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

        {/* Right Column */}
        <div className="dashboard-right-column">
          {/* Quick Actions */}
          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              {features.map((f, idx) => (
                <div className="action-card" key={idx} onClick={f.action}>
                  <div className="action-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Featured Leagues */}
          <section className="featured-leagues">
            <h2>Featured Leagues</h2>
            <div className="featured-leagues-grid">
              {leagues.slice(0, 6).map((league, idx) => (
                <div 
                  className="featured-league-card" 
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
    </div>
  );
};

export default HomeScreen;