// components/Commentary/LiveCommentaryFeed.js
import React, { useEffect, useState, useRef } from "react";
import { apiClient } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/LiveCommentaryFeed.css";

const LiveCommentaryFeed = ({ matchId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const initialLoadDone = useRef(false);
  const feedRef = useRef(null);

  // Auto-scroll to bottom when new comments appear
  useEffect(() => {
    if (!feedRef.current) return;
    if (isAtBottom) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [comments, isAtBottom]);

  const handleScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    const threshold = 40; // px from bottom to consider "at bottom"
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    if (!matchId) return;
    let interval;

    const fetchData = async () => {
      try {
        // Only show loading spinner on the very first fetch to avoid flicker
        if (!initialLoadDone.current) setLoading(true);
        const data = await apiClient.getCommentary(matchId);
        if (Array.isArray(data)) {
          // Avoid clearing the feed on transient empty responses
          if (data.length === 0) {
            // keep previous comments
          } else {
            // Merge new items by id keeping order stable
            setComments((prev) => {
              const seen = new Set(prev.map((p) => p.id));
              const merged = [...prev];
              for (const c of data) {
                if (!seen.has(c.id)) merged.push(c);
              }
              // If API returns a superset with updated timestamps/order, prefer API order
              // when it is longer than prev
              if (data.length >= prev.length) return data;
              return merged;
            });
          }
        }
      } catch (err) {
        console.error("❌ Error fetching commentary:", err);
      } finally {
        initialLoadDone.current = true;
        setLoading(false);
      }
    };

    fetchData();
  // Refresh every 5 seconds for live updates
  interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [matchId]);

  if (loading) return <p className="feed-loading">Loading live commentary...</p>;

  return (
    <div className="live-commentary-container">
      <h3 className="feed-title">🎙 Live Commentary</h3>
  <div className="live-feed" ref={feedRef} onScroll={handleScroll}>
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
      {!isAtBottom && (
        <button
          className="jump-to-latest"
          onClick={() => {
            if (feedRef.current) {
              feedRef.current.scrollTop = feedRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }}
        >
          Jump to latest
        </button>
      )}
    </div>
  );
};

export default LiveCommentaryFeed;
