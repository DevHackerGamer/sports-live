// API endpoint for match statistics - compatible with both Express and Vercel
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

// Get collection for match statistics
const getMatchStatisticsCollection = async () => {
  const database = await getDatabase();
  return database.collection('Match_Statistics');
};

// Get collection for matches to verify match exists
const getMatchesCollection = async () => {
  const database = await getDatabase();
  return database.collection('Match_Info');
};

// Validate statistics data structure
function validateStatistics(data) {
  const validFields = [
    'matchId',
    'possession',
    'shotsOnTarget',
    'shotsOffTarget', 
    'totalShots',
    'corners',
    'fouls',
    'yellowCards',
    'redCards',
    'offsides',
    'saves',
    'passAccuracy',
    'ballRecoveries',
    'tacklesTotalAttempted',
    'tacklesWon',
    'interceptions',
    'clearances',
    'aerialDuelsWon',
    'aerialDuelsTotal',
    'distanceCovered',
    'sprintDistance',
    'dribbles',
    'crosses',
    'longBalls',
    'lastUpdated'
  ];

  const stats = {};
  
  // Ensure matchId is present and valid
  if (!data.matchId) {
    throw new Error('matchId is required');
  }
  stats.matchId = data.matchId;

  // Set possession with validation (0-100)
  stats.possession = {
    home: Math.max(0, Math.min(100, Number(data.possession?.home || 50))),
    away: Math.max(0, Math.min(100, Number(data.possession?.away || 50)))
  };

  // Ensure possession adds up to 100%
  const totalPossession = stats.possession.home + stats.possession.away;
  if (totalPossession !== 100) {
    stats.possession.away = 100 - stats.possession.home;
  }

  // Validate and set other statistics (must be non-negative numbers)
  const statFields = [
    'shotsOnTarget', 'shotsOffTarget', 'totalShots', 'corners', 'fouls',
    'yellowCards', 'redCards', 'offsides', 'saves', 'passAccuracy',
    'ballRecoveries', 'tacklesTotalAttempted', 'tacklesWon', 'interceptions',
    'clearances', 'aerialDuelsWon', 'aerialDuelsTotal', 'distanceCovered',
    'sprintDistance', 'dribbles', 'crosses', 'longBalls'
  ];

  statFields.forEach(field => {
    if (data[field] !== undefined) {
      if (typeof data[field] === 'object' && data[field] !== null) {
        // Handle home/away split stats
        stats[field] = {
          home: Math.max(0, Number(data[field].home || 0)),
          away: Math.max(0, Number(data[field].away || 0))
        };
      } else {
        // Handle single value stats
        stats[field] = Math.max(0, Number(data[field] || 0));
      }
    }
  });

  stats.lastUpdated = new Date();
  
  return stats;
}

// Main handler function
const handler = async (req, res) => {
  try {
    const db = await getDatabase();
    const statsCollection = await getMatchStatisticsCollection();
    const matchesCollection = await getMatchesCollection();

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, statsCollection);
        break;
      case 'POST':
        await handlePost(req, res, statsCollection, matchesCollection);
        break;
      case 'PUT':
        await handlePut(req, res, statsCollection);
        break;
      case 'DELETE':
        await handleDelete(req, res, statsCollection);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Match statistics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/match-statistics?matchId=xxx
async function handleGet(req, res, statsCollection) {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId parameter is required' });
  }

  try {
    const stats = await statsCollection.findOne({ matchId: matchId });
    
    if (!stats) {
      // Return default statistics if none exist
      const defaultStats = {
        matchId,
        possession: { home: 50, away: 50 },
        shotsOnTarget: { home: 0, away: 0 },
        shotsOffTarget: { home: 0, away: 0 },
        totalShots: { home: 0, away: 0 },
        corners: { home: 0, away: 0 },
        fouls: { home: 0, away: 0 },
        yellowCards: { home: 0, away: 0 },
        redCards: { home: 0, away: 0 },
        offsides: { home: 0, away: 0 },
        saves: { home: 0, away: 0 },
        passAccuracy: { home: 0, away: 0 },
        lastUpdated: new Date()
      };
      return res.status(200).json(defaultStats);
    }

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching match statistics:', error);
    res.status(500).json({ error: 'Failed to fetch match statistics' });
  }
}

// POST /api/match-statistics (create new statistics)
async function handlePost(req, res, statsCollection, matchesCollection) {
  try {
    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }

    // Verify match exists
    let matchObjectId;
    try {
      matchObjectId = new ObjectId(matchId);
    } catch (e) {
      // If not a valid ObjectId, try as string
      matchObjectId = matchId;
    }

    const matchExists = await matchesCollection.findOne({
      $or: [
        { _id: matchObjectId },
        { id: matchId },
        { _id: matchId }
      ]
    });

    if (!matchExists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if statistics already exist
    const existingStats = await statsCollection.findOne({ matchId });
    if (existingStats) {
      return res.status(409).json({ error: 'Statistics already exist for this match' });
    }

    const validatedStats = validateStatistics(req.body);
    const result = await statsCollection.insertOne(validatedStats);

    res.status(201).json({
      _id: result.insertedId,
      ...validatedStats
    });
  } catch (error) {
    console.error('Error creating match statistics:', error);
    res.status(500).json({ error: 'Failed to create match statistics' });
  }
}

// PUT /api/match-statistics (update existing statistics)
async function handlePut(req, res, statsCollection) {
  try {
    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }

    const validatedStats = validateStatistics(req.body);
    
    const result = await statsCollection.updateOne(
      { matchId },
      { $set: validatedStats },
      { upsert: true }
    );

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      return res.status(404).json({ error: 'Failed to update statistics' });
    }

    const updatedStats = await statsCollection.findOne({ matchId });
    res.status(200).json(updatedStats);
  } catch (error) {
    console.error('Error updating match statistics:', error);
    res.status(500).json({ error: 'Failed to update match statistics' });
  }
}

// DELETE /api/match-statistics?matchId=xxx
async function handleDelete(req, res, statsCollection) {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId parameter is required' });
  }

  try {
    const result = await statsCollection.deleteOne({ matchId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Statistics not found for this match' });
    }

    res.status(200).json({ message: 'Match statistics deleted successfully' });
  } catch (error) {
    console.error('Error deleting match statistics:', error);
    res.status(500).json({ error: 'Failed to delete match statistics' });
  }
}

module.exports = handler;