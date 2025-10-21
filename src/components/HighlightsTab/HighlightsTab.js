import React, { useEffect, useState } from "react";
import { apiClient } from "../../lib/api";
import "../../styles/HighlightsTab.css";

const leagues = [
  { name: "Premier League", channelId: "UCxZf3zG2q1oVmtz0gW1yj9Q" },
  { name: "Champions League", channelId: "UCpcTrCXblq78GZrTUTLWeBw" },
  { name: "La Liga", channelId: "UCxm7h3Jv2uG0d6zOQeqnqTw" },
  { name: "Serie A", channelId: "UCz1hQvN3E_0gxH3JUbj3c1Q" },
  { name: "Ligue 1", channelId: "UC-VK0tmIu3W2oKMzOJDC0pQ" },
  { name: "Bundesliga", channelId: "UCVCx8sY5ETRWRzYzYkz3rTQ" },
];

const HighlightsTab = () => {
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(leagues[0].name);
  const [modalVideo, setModalVideo] = useState(null);

  useEffect(() => {
    const loadHighlights = async () => {
      setLoading(true);
      try {
        const results = {};
        for (const league of leagues) {
          const data = await apiClient.getFootballHighlights(league.name);
          results[league.name] = data || [];
        }
        setVideos(results);
      } catch (err) {
        console.error("❌ Error loading highlights:", err);
        setError("Failed to load highlights. Try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, []);

  const openModal = (videoId, title) => setModalVideo({ videoId, title });
  const closeModal = () => setModalVideo(null);

  const formatDuration = (seconds = null) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  return `${mins}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatViews = (views = 100000) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  if (loading) return (
    <div className="highlights-page">
      <div className="highlights-loading">
        <p>Loading amazing highlights...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="highlights-page">
      <div className="highlights-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="highlights-page">
      <div className="highlights-header">
        <h2> Season Highlights</h2>
        <div className="league-selector">
          <label htmlFor="league-select">League:</label>
          <select
            id="league-select"
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
          >
            {leagues.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="highlights-grid">
        {videos[selectedLeague]?.length ? (
          videos[selectedLeague].map((v) => (
            <div
              key={v.videoId}
              className="highlight-card"
              onClick={() => openModal(v.videoId, v.title)}
            >
             
      <div className="highlight-thumbnail">
        <img
          src={v.thumbnail}
          alt={v.title}
          loading="lazy"
        />
      <div className="highlight-overlay">
      <div className="play-button"></div>
        </div>
          <div className="league-indicator">{selectedLeague}</div>
      </div>
              <div className="highlight-info">
                <h3>{v.title}</h3>
                <p>{v.channelTitle}</p>
                <div className="highlight-meta">
                  <span className="highlight-duration">
                    {formatDuration()}
                  </span>
                  <span className="highlight-views">
                    {formatViews()}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No highlights found for {selectedLeague}. Check back later!</p>
        )}
      </div>

      {/* Modal for video playback */}
      {modalVideo && (
        <div className="highlight-modal" onClick={closeModal}>
          <div className="highlight-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="highlight-modal-close" onClick={closeModal}>
              ×
            </button>
            <iframe
              width="100%"
              height="450"
              src={`https://www.youtube.com/embed/${modalVideo.videoId}?autoplay=1`}
              title={modalVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <div className="highlight-modal-title">
              {modalVideo.title}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightsTab;
