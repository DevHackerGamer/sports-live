// src/components/HighlightsTab/HighlightsTab.jsx
import React, { useEffect, useState } from "react";
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
    const apiKey = process.env.REACT_APP_YT_API_KEY;

    if (!apiKey) {
      setError("YouTube API key is missing. Add REACT_APP_YT_API_KEY to your .env");
      setLoading(false);
      return;
    }

    // use channel first, fallback to keyword search
    const fetchLeagueVideos = async (league) => {
      const base = `https://www.googleapis.com/youtube/v3/search`;

      try {
        // 1️⃣ Try fetching from official channel
        const channelParams = new URLSearchParams({
          part: "snippet",
          channelId: league.channelId,
          q: "highlights",
          type: "video",
          order: "date",
          videoDuration: "short",
          maxResults: "8",
          key: apiKey,
        });

        const channelRes = await fetch(`${base}?${channelParams.toString()}`);
        const channelData = await channelRes.json();

        if (channelData.items && channelData.items.length > 0) {
          return channelData.items;
        }

        // 2️⃣ Fallback: keyword-based search
        console.warn(
          `⚠️ No results from ${league.name} official channel. Falling back to keyword search.`
        );

        const queryParams = new URLSearchParams({
          part: "snippet",
          q: `${league.name} football 2025/26 highlights`,
          type: "video",
          order: "relevance",
          videoDuration: "short",
          maxResults: "8",
          key: apiKey,
        });

        const queryRes = await fetch(`${base}?${queryParams.toString()}`);
        const queryData = await queryRes.json();

        return queryData.items || [];
      } catch (err) {
        console.error("Error fetching YouTube videos for", league.name, err);
        return [];
      }
    };

    const loadAll = async () => {
      setLoading(true);
      try {
        const resultsArray = await Promise.all(
          leagues.map(async (league) => {
            const vids = await fetchLeagueVideos(league);
            return { [league.name]: vids };
          })
        );
        const results = Object.assign({}, ...resultsArray);
        setVideos(results);
      } catch (err) {
        console.error("Error loading highlights:", err);
        setError("Failed to load highlights. Try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  if (loading) return <p className="highlights-loading">Loading highlights...</p>;
  if (error)
    return (
      <div className="highlights-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );

  const openModal = (videoId, title) => {
    setModalVideo({ videoId, title });
  };

  const closeModal = () => setModalVideo(null);

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
        {videos[selectedLeague]?.map((v) => (
          <div
            key={v.id.videoId}
            className="highlight-card"
            onClick={() => openModal(v.id.videoId, v.snippet.title)}
          >
            <div className="highlight-thumbnail">
              <img
                src={
                  v.snippet.thumbnails.high?.url ||
                  v.snippet.thumbnails.medium.url
                }
                alt={v.snippet.title}
                loading="lazy"
              />
            </div>
            <div className="highlight-info">
              <h3>{v.snippet.title}</h3>
              <p>{v.snippet.channelTitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalVideo && (
        <div className="highlight-modal" onClick={closeModal}>
          <div
            className="highlight-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
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
