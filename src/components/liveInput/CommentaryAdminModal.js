
import React, { useState, useEffect } from "react";
import { apiClient } from "../../lib/api";
import "../../styles/CommentaryAdminModal.css";

const CommentaryAdminModal = ({ matchId, isOpen, onClose }) => {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && matchId) {
      fetchComments();
    }
  }, [isOpen, matchId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCommentary(matchId);
      setComments(data || []);
    } catch (err) {
      console.error("❌ Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!input.trim()) return;
    const newComment = {
      id: Date.now(),
      time: time || `${comments.length + 1}'`,
      text: input.trim(),
    };

    try {
      await apiClient.addCommentary(matchId, newComment);
      setInput("");
      setTime("");
      fetchComments();
    } catch (err) {
      console.error("❌ Error adding comment:", err);
    }
  };

  const handleDelete = async (id) => {
    const updated = comments.filter((c) => c.id !== id);
    try {
      await apiClient.overwriteCommentary(matchId, updated);
      fetchComments();
    } catch (err) {
      console.error("❌ Error deleting comment:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="commentary-modal-overlay">
      <div className="commentary-modal">
        <h2>🎙 Manage Live Commentary</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="commentary-list">
            {comments.map((c) => (
              <div key={c.id} className="commentary-item">
                <span className="commentary-time">{c.time}</span>
                <span className="commentary-text">{c.text}</span>
                <button className="delete-btn" onClick={() => handleDelete(c.id)}>
                  🗑
                </button>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="no-commentary">No commentary yet.</p>
            )}
          </div>
        )}

        <div className="commentary-input">
          <input
            type="text"
            placeholder="Time (e.g. 67')"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter commentary..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button onClick={handleAdd}>Add</button>
        </div>

        <button className="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default CommentaryAdminModal;
