// API endpoint for match statistics - compatible with both Express and Vercel
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

// Get collection for match statistics (ESPN-first cache)
const getMatchStatisticsCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Statistics_ESPN');
};
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
  const statsCollectionESPN = await getMatchStatisticsCollectionESPN();
  const statsCollection = await getMatchStatisticsCollection();
    const matchesCollection = await getMatchesCollection();

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, statsCollection, statsCollectionESPN);
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
async function handleGet(req, res, statsCollection, statsCollectionESPN) {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId parameter is required' });
  }

  try {
    // Ensure indexes for fast lookup
    try { await statsCollectionESPN.createIndex({ matchId: 1 }); } catch(_) {}
    try { await statsCollection.createIndex({ matchId: 1 }); } catch(_) {}
    // Prefer ESPN-cached stats first
    let stats = await statsCollectionESPN.findOne({ matchId: matchId });
    if (!stats) {
      stats = await statsCollection.findOne({ matchId: matchId });
    }
    
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

    // Sanitize stats: coerce nested ESPN values to numbers and fix percentages
    const toNumber = (v, { clampPct = false } = {}) => {
      if (v == null) return 0;
      if (typeof v === 'number' && !isNaN(v)) return clampPct ? Math.max(0, Math.min(100, v)) : Math.max(0, v);
      if (typeof v === 'object') {
        const cand = v.displayValue ?? v.value ?? v.text;
        return toNumber(cand, { clampPct });
      }
      if (typeof v === 'string') {
        const pct = /(\d{1,3})%/.exec(v);
        let n;
        if (pct) n = parseInt(pct[1], 10);
        else n = parseInt(v.replace(/[^0-9-]/g, ''), 10);
        if (isNaN(n)) return 0;
        return clampPct ? Math.max(0, Math.min(100, n)) : Math.max(0, n);
      }
      return 0;
    };

    const sanitizePair = (pair, { clampPct = false } = {}) => {
      const home = toNumber(pair?.home, { clampPct });
      const away = toNumber(pair?.away, { clampPct });
      return { home, away };
    };

    const sanitizeStats = (doc) => {
      if (!doc) return null;
      const out = { ...doc };
      const pctFields = ['possession', 'passAccuracy'];
      const pairFields = [
        'shotsOnTarget', 'shotsOffTarget', 'totalShots', 'corners', 'fouls',
        'yellowCards', 'redCards', 'offsides', 'saves'
      ];
      for (const f of pctFields) {
        if (out[f] != null) out[f] = sanitizePair(out[f], { clampPct: true });
      }
      for (const f of pairFields) {
        if (out[f] != null) out[f] = sanitizePair(out[f]);
      }
      if (out.possession && (out.possession.home != null && out.possession.away != null)) {
        const total = out.possession.home + out.possession.away;
        if (total !== 100) {
          if (total > 0) {
            const scale = 100 / total;
            out.possession.home = Math.max(0, Math.min(100, Math.round(out.possession.home * scale)));
            out.possession.away = 100 - out.possession.home;
          }
        }
      }
      return out;
    };

    const clean = sanitizeStats(stats);
    try {
      const toPersist = { ...clean, lastUpdated: new Date() };
      await statsCollection.updateOne({ matchId }, { $set: toPersist }, { upsert: true });
      await statsCollectionESPN.updateOne({ matchId }, { $set: toPersist }, { upsert: true });
    } catch (_) {}

    if (clean?.possession && clean.possession.home === 0 && clean.possession.away === 0) {
      clean.possession = { home: 50, away: 50 };
    }

    return res.status(200).json(clean);
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
    
    // Update both regular and ESPN collections
    const db = await getDatabase();
    const statsCollectionESPN = await getMatchStatisticsCollectionESPN();
    
    const [result, resultESPN] = await Promise.all([
      statsCollection.updateOne(
        { matchId },
        { $set: validatedStats },
        { upsert: true }
      ),
      statsCollectionESPN.updateOne(
        { matchId },
        { $set: validatedStats },
        { upsert: true }
      )
    ]);

    if (result.modifiedCount === 0 && result.upsertedCount === 0 && resultESPN.modifiedCount === 0 && resultESPN.upsertedCount === 0) {
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