const { getMatchesCollection, getTeamsCollection } = require('../lib/mongodb');

// GET /api/matches - Get all matches
async function getMatches(req, res) {
  try {
    const matchesCollection = await getMatchesCollection(); // This now points to Match_Info
    const matches = await matchesCollection.find({}).toArray();
    
    res.status(200).json({
      success: true,
      data: matches,
      count: matches.length,
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

// POST /api/matches - Create/update multiple matches
async function createMatches(req, res) {
  try {
    const { matches } = req.body;
    
    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data: matches array is required'
      });
    }

    const matchesCollection = await getMatchesCollection();
    
    // Use upsert to update existing matches or insert new ones
    const operations = matches.map(match => ({
      updateOne: {
        filter: { id: match.id },
        update: { 
          $set: {
            ...match,
            lastUpdated: new Date().toISOString()
          }
        },
        upsert: true
      }
    }));

    const result = await matchesCollection.bulkWrite(operations);
    
    res.status(200).json({
      success: true,
      message: 'Matches updated successfully',
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } catch (error) {
    console.error('Error creating/updating matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update matches',
      message: error.message
    });
  }
}

// GET /api/matches/:id - Get single match
async function getMatch(req, res) {
  try {
    const { id } = req.params;
    const matchesCollection = await getMatchesCollection();
    
    const match = await matchesCollection.findOne({ id: id });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
      message: error.message
    });
  }
}

// PUT /api/matches/:id - Update single match
async function updateMatch(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const matchesCollection = await getMatchesCollection();
    
    const result = await matchesCollection.updateOne(
      { id: id },
      { 
        $set: {
          ...updateData,
          lastUpdated: new Date().toISOString()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update match',
      message: error.message
    });
  }
}

// DELETE /api/matches/:id - Delete single match
async function deleteMatch(req, res) {
  try {
    const { id } = req.params;
    const matchesCollection = await getMatchesCollection();
    
    const result = await matchesCollection.deleteOne({ id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete match',
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
    // Extract ID from URL path
    const urlParts = req.url.split('/');
    const id = urlParts[3]; // /api/matches/:id
    
    // Create req.params for compatibility
    req.params = { id };

    switch (req.method) {
      case 'GET':
        if (id && id !== '') {
          await getMatch(req, res);
        } else {
          await getMatches(req, res);
        }
        break;
      case 'POST':
        await createMatches(req, res);
        break;
      case 'PUT':
        await updateMatch(req, res);
        break;
      case 'DELETE':
        await deleteMatch(req, res);
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
