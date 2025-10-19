import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/FootballNews.css';

const leagues = [
  { code: 'eng.1', name: 'Premier League' },
  { code: 'esp.1', name: 'La Liga' },
  { code: 'ita.1', name: 'Serie A' },
  { code: 'ger.1', name: 'Bundesliga' },
  { code: 'fra.1', name: 'Ligue 1' },
  { code: 'uefa.champions', name: 'Champions League' }
];

const FootballNewsPage = ({ onBack }) => {
  const [leagueCode, setLeagueCode] = useState('eng.1');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.request(`/api/football-news?leagueCode=${leagueCode}&limit=50`);
      setNews(res || []);
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError('Failed to load news. Please try again.');
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [leagueCode]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    // Show the placeholder by finding the next sibling
    const placeholder = e.target.nextSibling;
    if (placeholder && placeholder.className === 'news-image-placeholder') {
      placeholder.style.display = 'flex';
    }
  };

  return (
    <div className="football-news-page">
      <div className="news-header">
        <div>
          {onBack && <button onClick={onBack} className="back-btn">← Back to Home</button>}
        </div>
        <h2>Football News</h2>
        <div className="league-selector">
          <label>Filter by League:</label>
          <select value={leagueCode} onChange={e => setLeagueCode(e.target.value)}>
            {leagues.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="news-list">
          <p>Loading latest news...</p>
        </div>
      ) : error ? (
        <div className="news-error">
          <p>{error}</p>
          <button onClick={fetchNews}>Try Again</button>
        </div>
      ) : (
        <div className="news-list">
          {news.length > 0 ? (
            news.map(article => (
              <div key={article._id} className="news-card">
                <div className="news-image-container">
                  {article.images?.length > 0 ? (
                    <>
                      <img
                        src={article.images[0].url}
                        alt={article.images[0].caption || article.headline}
                        className="news-image"
                        onError={handleImageError}
                      />
                      <div className="news-image-placeholder" style={{ display: 'none' }}>
                        No Image Available
                      </div>
                    </>
                  ) : (
                    <div className="news-image-placeholder">
                      No Image Available
                    </div>
                  )}
                </div>
                <div className="news-content">
                  <h3>{article.headline}</h3>
                  <p className="news-description">{article.description}</p>
                  <div className="news-meta">
                    <span className="news-author">{article.byline || 'Unknown Author'}</span>
                    <span className="news-date">
                      {new Date(article.published).toLocaleDateString()}
                    </span>
                  </div>
                  {article.link && (
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="news-link">
                      Read Full Article
                    </a>
                  )}
                  {article.categories?.length > 0 && (
                    <p className="news-categories">
                      <strong>Categories:</strong> {article.categories.filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="news-list">
              <p>No news available for this league at the moment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FootballNewsPage;