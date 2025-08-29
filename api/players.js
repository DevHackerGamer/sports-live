// Players API endpoint
const { getPlayersCollection } = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const playersCollection = await getPlayersCollection();

  if (req.method === 'GET') {
    try {
      const { teamId, position, nationality, limit = 50, offset = 0 } = req.query;
      
      let filter = {};
      if (teamId) filter.teamId = parseInt(teamId);
      if (position) filter.position = new RegExp(position, 'i');
      if (nationality) filter.nationality = new RegExp(nationality, 'i');

      const players = await playersCollection
        .find(filter)
        .sort({ name: 1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray();

      const total = await playersCollection.countDocuments(filter);

      res.status(200).json({
        success: true,
        players,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  } else if (req.method === 'POST') {
    try {
      const playerData = req.body;
      
      if (!playerData.name) {
        return res.status(400).json({ error: 'Player name is required' });
      }

      const player = {
        ...playerData,
        lastUpdated: new Date()
      };

      const result = await playersCollection.insertOne(player);
      
      res.status(201).json({
        success: true,
        playerId: result.insertedId,
        player
      });
    } catch (error) {
      console.error('Error creating player:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const updates = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Player ID is required' });
      }

      const result = await playersCollection.updateOne(
        { id: parseInt(id) },
        { 
          $set: { 
            ...updates, 
            lastUpdated: new Date() 
          } 
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.status(200).json({
        success: true,
        modified: result.modifiedCount > 0
      });
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Player ID is required' });
      }

      const result = await playersCollection.deleteOne({ id: parseInt(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.status(200).json({
        success: true,
        deleted: true
      });
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ error: 'Failed to delete player' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

module.exports = handler;
