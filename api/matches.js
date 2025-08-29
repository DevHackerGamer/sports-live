// API endpoint for matches - compatible with both Express and Vercel
const { getMatchesCollection } = require('../lib/mongodb');

// GET /api/matches - Get all matches with optional filters
async function getMatches(req, res) {
  try {
    const { 
      limit = 100, 
      status, 
      competition, 
      range = 7 
    } = req.query;

    const matchesCollection = await getMatchesCollection();
    
    // Build filter
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (competition) {
      filter['competition.name'] = new RegExp(competition, 'i');
    }
    
    // Date range filter (default: last 7 days to next 7 days)
    if (range) {
      const days = parseInt(range);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      
      filter.utcDate = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      };
    }

    const matches = await matchesCollection
      .find(filter)
      .sort({ utcDate: 1 })
      .limit(parseInt(limit))
      .toArray();
    
    res.status(200).json({
      success: true,
      data: matches,
      count: matches.length,
      filters: { status, competition, range: parseInt(range), limit: parseInt(limit) },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: error.message
    });
  }
}

// Handle different HTTP methods
async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        await getMatches(req, res);
        break;
      default:
        res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = handler;
