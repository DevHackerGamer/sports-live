// User Matches (Watchlist) API endpoint
const { getUserMatchesCollection, getUsersInfoCollection } = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userMatches = await getUserMatchesCollection();
  const users = await getUsersInfoCollection();

  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      const filter = userId ? { userId } : {};
      const list = await userMatches.find(filter).sort({ addedAt: -1 }).toArray();
      res.status(200).json({ success: true, data: list, total: list.length });
    } catch (error) {
      console.error('Error fetching user watchlist:', error);
      res.status(500).json({ error: 'Failed to fetch user watchlist' });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, matchId, match } = req.body || {};
      if (!userId || !matchId) {
        return res.status(400).json({ error: 'userId and matchId are required' });
      }

      // ensure unique user+match
      const existing = await userMatches.findOne({ userId, matchId: String(matchId) });
      if (existing) {
        return res.status(409).json({ error: 'Match already in watchlist' });
      }

      const doc = {
        userId,
        matchId: String(matchId),
        // store small denormalized snapshot for quick listing
        homeTeam: match?.homeTeam?.name || match?.homeTeam || null,
        awayTeam: match?.awayTeam?.name || match?.awayTeam || null,
        competition: match?.competition?.name || match?.competition || null,
        utcDate: match?.utcDate || null,
        status: match?.status || null,
        addedAt: new Date(),
        lastUpdated: new Date(),
      };

      const result = await userMatches.insertOne(doc);

      await users.updateOne(
        { userId },
        { $inc: { watchlistCount: 1 }, $set: { lastActivity: new Date() } },
        { upsert: true }
      );

      res.status(201).json({ success: true, id: result.insertedId, data: doc });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({ error: 'Failed to add match to watchlist' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { userId, matchId } = req.query || {};
      if (!userId || !matchId) {
        return res.status(400).json({ error: 'userId and matchId are required' });
      }
      const result = await userMatches.deleteOne({ userId, matchId: String(matchId) });
      if (!result.deletedCount) {
        return res.status(404).json({ error: 'Watchlist item not found' });
      }
      await users.updateOne(
        { userId },
        { $inc: { watchlistCount: -1 }, $set: { lastActivity: new Date() } }
      );
      res.status(200).json({ success: true, deleted: true });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({ error: 'Failed to remove match from watchlist' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

module.exports = handler;
