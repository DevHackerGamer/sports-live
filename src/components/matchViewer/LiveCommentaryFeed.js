// components/Commentary/LiveCommentaryFeed.js
import React, { useEffect, useState, useRef } from "react";
import { apiClient } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/LiveCommentaryFeed.css";

const LiveCommentaryFeed = ({ matchId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef(null);

  // Auto-scroll to bottom when new comments appear
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [comments]);

  useEffect(() => {
    if (!matchId) return;
    let interval;

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getCommentary(matchId);
        setComments(data || []);
      } catch (err) {
        console.error("❌ Error fetching commentary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 10 seconds for live updates
    interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, [matchId]);

  if (loading) return <p className="feed-loading">Loading commentary...</p>;

  return (
    <div className="live-commentary-container">
      <h3 className="feed-title">🎙 Live Commentary</h3>
      <div className="live-feed" ref={feedRef}>
        <AnimatePresence>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              className="feed-item"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="feed-time">{c.time}</span>
              <span className="feed-text">{c.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {comments.length === 0 && (
          <p className="no-comments">No commentary yet for this match.</p>
        )}
      </div>
    </div>
  );
};

export default LiveCommentaryFeed;
