// Players API endpoint
const { getPlayersCollection, getPlayersCollectionESPN } = require('../lib/mongodb');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const playersCollection = await getPlayersCollection();
  const playersCollectionESPN = await getPlayersCollectionESPN();

  if (req.method === 'GET') {
    try {
      const { teamId, teamName, position, nationality, limit = 50, offset = 0, source } = req.query;

      let resolvedTeamId = teamId;
      // If no teamId but teamName provided, attempt to resolve via Teams collection
      if (!resolvedTeamId && teamName) {
        try {
          const { getTeamsCollection, getTeamsCollectionESPN } = require('../lib/mongodb');
          const teamsCol = await getTeamsCollection();
          const teamsColESPN = await getTeamsCollectionESPN();
          
          // Try ESPN collection first
          let teamDoc = await teamsColESPN.findOne({ name: { $regex: `^${teamName}$`, $options: 'i' } });
          if (!teamDoc) {
            teamDoc = await teamsCol.findOne({ name: { $regex: `^${teamName}$`, $options: 'i' } });
          }
          
          if (teamDoc && (teamDoc.id || teamDoc._id)) {
            resolvedTeamId = teamDoc.id || teamDoc._id;
          }
        } catch (e) {
          console.warn('teamName resolution failed', e.message);
        }
      }

      let filter = {};
      if (resolvedTeamId) {
        const numeric = parseInt(resolvedTeamId);
        filter.teamId = isNaN(numeric) ? resolvedTeamId : numeric;
      }
      if (position) filter.position = new RegExp(position, 'i');
      if (nationality) filter.nationality = new RegExp(nationality, 'i');

      // By default, prioritize ESPN players (API-backed), fallback to regular collection
      const useAllPlayers = source === 'all';
      
      let players = [];
      let total = 0;
      
      if (useAllPlayers) {
        // Fetch from both collections and merge
        const [espnPlayers, regularPlayers] = await Promise.all([
          playersCollectionESPN.find(filter).sort({ name: 1 }).skip(parseInt(offset)).limit(parseInt(limit)).toArray(),
          playersCollection.find(filter).sort({ name: 1 }).skip(parseInt(offset)).limit(parseInt(limit)).toArray()
        ]);
        
        // Merge and deduplicate by player ID
        const playerMap = new Map();
        for (const player of [...espnPlayers, ...regularPlayers]) {
          const key = player.id || player._id?.toString() || player.name;
          if (!playerMap.has(key)) {
            playerMap.set(key, player);
          }
        }
        players = Array.from(playerMap.values());
        
        const [espnTotal, regularTotal] = await Promise.all([
          playersCollectionESPN.countDocuments(filter),
          playersCollection.countDocuments(filter)
        ]);
        total = Math.max(espnTotal, regularTotal);
      } else {
        // Default: Try ESPN collection first
        players = await playersCollectionESPN
          .find(filter)
          .sort({ name: 1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit))
          .toArray();
        
        total = await playersCollectionESPN.countDocuments(filter);
        
        // If ESPN collection has no players, fallback to regular collection
        if (players.length === 0) {
          players = await playersCollection
            .find(filter)
            .sort({ name: 1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .toArray();
          
          total = await playersCollection.countDocuments(filter);
        }
      }

      res.status(200).json({
        success: true,
        players,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        source: players.length > 0 && players[0]?.source ? 'espn' : 'regular'
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
