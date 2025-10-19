// Favorite Teams API endpoint
const { getFavoriteTeamsCollection, getUsersInfoCollection } = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const favoriteTeamsCollection = await getFavoriteTeamsCollection();
  const usersCollection = await getUsersInfoCollection();

  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      
      let filter = {};
      if (userId) filter.userId = userId;

      const favorites = await favoriteTeamsCollection
        .find(filter)
        .sort({ addedAt: -1 })
        .toArray();

      res.status(200).json({
        success: true,
        favorites,
        total: favorites.length
      });
    } catch (error) {
      console.error('Error fetching favorite teams:', error);
      res.status(500).json({ error: 'Failed to fetch favorite teams' });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, teamId, teamName } = req.body;
      
      if (!userId || !teamId || !teamName) {
        return res.status(400).json({ error: 'userId, teamId, and teamName are required' });
      }

      // Check if already exists
      const existing = await favoriteTeamsCollection.findOne({
        userId,
        teamId: parseInt(teamId)
      });

      if (existing) {
        return res.status(400).json({ error: 'Team already in favorites' });
      }

      const favorite = {
        userId,
        teamId: parseInt(teamId),
        teamName,
        addedAt: new Date(),
        lastUpdated: new Date()
      };

      const result = await favoriteTeamsCollection.insertOne(favorite);
      
      // Update user's favorite count
      await usersCollection.updateOne(
        { userId },
        { 
          $inc: { favoriteTeamsCount: 1 },
          $set: { lastActivity: new Date() }
        },
        { upsert: true }
      );

      res.status(201).json({
        success: true,
        favoriteId: result.insertedId,
        favorite
      });
    } catch (error) {
      console.error('Error adding favorite team:', error);
      res.status(500).json({ error: 'Failed to add favorite team' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { userId, teamId } = req.query;
      
      if (!userId || !teamId) {
        return res.status(400).json({ error: 'userId and teamId are required' });
      }

      const result = await favoriteTeamsCollection.deleteOne({
        userId,
        teamId: parseInt(teamId)
      });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Favorite team not found' });
      }

      // Update user's favorite count
      await usersCollection.updateOne(
        { userId },
        { 
          $inc: { favoriteTeamsCount: -1 },
          $set: { lastActivity: new Date() }
        }
      );

      res.status(200).json({
        success: true,
        deleted: true
      });
    } catch (error) {
      console.error('Error removing favorite team:', error);
      res.status(500).json({ error: 'Failed to remove favorite team' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

module.exports = handler;
