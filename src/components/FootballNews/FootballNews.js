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

  return (
    <div className="football-news-page">
      <div className="news-header">
        {onBack && <button onClick={onBack} className="back-btn">← Home</button>}
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
        <p>Loading news...</p>
      ) : error ? (
        <div className="news-error">
          <p>{error}</p>
          <button onClick={fetchNews}>Retry</button>
        </div>
      ) : (
        <div className="news-list">
          {news.length > 0 ? (
            news.map(article => (
              <div key={article._id} className="news-card">
                <h3>{article.headline}</h3>
                {article.images?.length > 0 && (
                  <img
                    src={article.images[0].url}
                    alt={article.images[0].caption || ''}
                    className="news-image"
                  />
                )}
                <p>{article.description}</p>
                <p><strong>By:</strong> {article.byline || 'Unknown'}</p>
                <p><small>{new Date(article.published).toLocaleString()}</small></p>
                {article.link && (
                  <a href={article.link} target="_blank" rel="noopener noreferrer">
                    Read more
                  </a>
                )}
                {article.categories?.length > 0 && (
                  <p className="news-categories">
                    Categories: {article.categories.filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p>No news available for this league.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FootballNewsPage;
