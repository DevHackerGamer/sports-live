const { getTeamsCollection } = require('../lib/mongodb');

// GET /api/teams - Get all teams
async function getTeams(req, res) {
  try {
    const teamsCollection = await getTeamsCollection(); // This now points to Teams collection
    const teams = await teamsCollection.find({}).toArray();
    
    res.status(200).json({
      success: true,
      data: teams, // Return full team objects instead of just names
      count: teams.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams',
      message: error.message
    });
  }
}

// POST /api/teams - Create/update teams
async function createTeams(req, res) {
  try {
    const { teams } = req.body;
    
    if (!teams || !Array.isArray(teams)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data: teams array is required'
      });
    }

    const teamsCollection = await getTeamsCollection();
    
    // Convert team names to objects and use upsert
    const operations = teams.map(teamName => ({
      updateOne: {
        filter: { name: teamName },
        update: { 
          $set: {
            name: teamName,
            lastUpdated: new Date().toISOString()
          }
        },
        upsert: true
      }
    }));

    const result = await teamsCollection.bulkWrite(operations);
    
    res.status(200).json({
      success: true,
      message: 'Teams updated successfully',
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } catch (error) {
    console.error('Error creating/updating teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update teams',
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
        await getTeams(req, res);
        break;
      case 'POST':
        await createTeams(req, res);
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
