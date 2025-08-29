const { getUsersCollection } = require('../lib/mongodb');

// GET /api/users/:userId/favorites - Get user favorites
async function getUserFavorites(req, res) {
  try {
    const { userId } = req.params;
    const usersCollection = await getUsersCollection();
    
    const user = await usersCollection.findOne({ userId: userId });
    
    res.status(200).json({
      success: true,
      data: user?.favorites || [],
      userId: userId
    });
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user favorites',
      message: error.message
    });
  }
}

// POST /api/users/:userId/favorites - Add favorite team
async function addUserFavorite(req, res) {
  try {
    const { userId } = req.params;
    const { teamName } = req.body;
    
    if (!teamName) {
      return res.status(400).json({
        success: false,
        error: 'Team name is required'
      });
    }

    const usersCollection = await getUsersCollection();
    
    // Add team to favorites array (using $addToSet to avoid duplicates)
    const result = await usersCollection.updateOne(
      { userId: userId },
      { 
        $addToSet: { favorites: teamName },
        $set: { 
          userId: userId,
          lastUpdated: new Date().toISOString()
        }
      },
      { upsert: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Favorite team added successfully',
      teamName: teamName
    });
  } catch (error) {
    console.error('Error adding user favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite team',
      message: error.message
    });
  }
}

// DELETE /api/users/:userId/favorites/:teamName - Remove favorite team
async function removeUserFavorite(req, res) {
  try {
    const { userId, teamName } = req.params;
    
    const usersCollection = await getUsersCollection();
    
    // Remove team from favorites array
    const result = await usersCollection.updateOne(
      { userId: userId },
      { 
        $pull: { favorites: teamName },
        $set: { lastUpdated: new Date().toISOString() }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Favorite team removed successfully',
      teamName: teamName
    });
  } catch (error) {
    console.error('Error removing user favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite team',
      message: error.message
    });
  }
}

// PUT /api/users/:userId/favorites - Update all user favorites
async function updateUserFavorites(req, res) {
  try {
    const { userId } = req.params;
    const { favorites } = req.body;
    
    if (!Array.isArray(favorites)) {
      return res.status(400).json({
        success: false,
        error: 'Favorites must be an array'
      });
    }

    const usersCollection = await getUsersCollection();
    
    const result = await usersCollection.updateOne(
      { userId: userId },
      { 
        $set: { 
          favorites: favorites,
          userId: userId,
          lastUpdated: new Date().toISOString()
        }
      },
      { upsert: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'User favorites updated successfully',
      favorites: favorites
    });
  } catch (error) {
    console.error('Error updating user favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user favorites',
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
    // Extract parameters from URL path
    const urlParts = req.url.split('/');
    const userId = urlParts[3]; // /api/users/:userId/favorites
    const teamName = urlParts[5]; // /api/users/:userId/favorites/:teamName
    
    // Create req.params for compatibility
    req.params = { userId, teamName };

    switch (req.method) {
      case 'GET':
        await getUserFavorites(req, res);
        break;
      case 'POST':
        await addUserFavorite(req, res);
        break;
      case 'PUT':
        await updateUserFavorites(req, res);
        break;
      case 'DELETE':
        if (teamName) {
          await removeUserFavorite(req, res);
        } else {
          res.status(400).json({
            success: false,
            error: 'Team name is required for deletion'
          });
        }
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
