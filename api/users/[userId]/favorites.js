const { getUsersCollection } = require('../../../lib/mongodb');

// GET /api/users/:userId/favorites - Get user favorites
async function getUserFavorites(req, res) {
  try {
    const { userId } = req.query;
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
    const { userId } = req.query;
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

// PUT /api/users/:userId/favorites - Update all user favorites
async function updateUserFavorites(req, res) {
  try {
    const { userId } = req.query;
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
export default async function handler(req, res) {
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
        await getUserFavorites(req, res);
        break;
      case 'POST':
        await addUserFavorite(req, res);
        break;
      case 'PUT':
        await updateUserFavorites(req, res);
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