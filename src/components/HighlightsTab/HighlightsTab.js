// src/components/HighlightsTab/HighlightsTab.jsx
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

  if (loading) return <p className="highlights-loading">Loading highlights...</p>;

  if (error)
    return (
      <div className="highlights-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );

  return (
    <div className="highlights-page">
      <div className="highlights-header">
        <h2>Season 2025/26 Highlights</h2>
        <div className="league-selector">
          <label htmlFor="league-select">Select League:</label>
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
                <div className="highlight-overlay">▶ Watch</div>
              </div>
              <div className="highlight-info">
                <h3>{v.title}</h3>
                <p>{v.channelTitle}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No highlights found for {selectedLeague}.</p>
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
              height="480"
              src={`https://www.youtube.com/embed/${modalVideo.videoId}`}
              title={modalVideo.title}
              allowFullScreen
            />
            <h3 style={{ marginTop: "1rem" }}>{modalVideo.title}</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightsTab;
