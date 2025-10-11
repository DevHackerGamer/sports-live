// /api/match-commentary.js
const { getMatchCommentaryCollection } = require('../lib/mongodb');

async function handler(req, res) {
  try {
    const commentaryCollection = await getMatchCommentaryCollection();

    // --- Fetch commentary by matchId ---
    if (req.method === 'GET') {
      const matchId = req.query.matchId;
      if (!matchId) {
        return res.status(400).json({ error: 'Missing matchId parameter' });
      }

      const doc = await commentaryCollection.findOne({ matchId: matchId.toString() });
      return res.status(200).json(doc ? doc.commentary : []);
    }

    // --- Add or overwrite commentary ---
    if (req.method === 'POST') {
      const { matchId, newComment, overwrite, commentary } = req.body;
      if (!matchId) {
        return res.status(400).json({ error: 'Missing matchId in request body' });
      }

      const matchKey = matchId.toString();
      const existing = await commentaryCollection.findOne({ matchId: matchKey });

      if (overwrite && Array.isArray(commentary)) {
        // Replace full commentary list
        await commentaryCollection.updateOne(
          { matchId: matchKey },
          { $set: { commentary, lastUpdated: new Date() } },
          { upsert: true }
        );
      } else if (newComment) {
        // Append new comment
        const update = {
          $push: { commentary: newComment },
          $set: { lastUpdated: new Date() },
        };
        await commentaryCollection.updateOne({ matchId: matchKey }, update, { upsert: true });
      } else {
        return res.status(400).json({ error: 'No newComment or commentary array provided' });
      }

      return res.status(200).json({ message: 'Commentary updated successfully' });
    }

    // --- Delete entire commentary for a match ---
    if (req.method === 'DELETE') {
      const { matchId } = req.query;
      if (!matchId) {
        return res.status(400).json({ error: 'Missing matchId parameter' });
      }
      await commentaryCollection.deleteOne({ matchId: matchId.toString() });
      return res.status(200).json({ message: 'Commentary deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('❌ match-commentary API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;
