// Vercel serverless function for user favorites API
const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  const { userId } = req.query;

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.DATABASE_NAME || 'SportsLiveTrackerDB');
    const usersCollection = db.collection('Users');

    if (req.method === 'GET') {
      // Get user favorites
      const user = await usersCollection.findOne({ userId });
      const favorites = user?.favorites || [];
      
      res.status(200).json({
        success: true,
        data: favorites,
        count: favorites.length,
        lastUpdated: new Date().toISOString()
      });
      
    } else if (req.method === 'POST') {
      // Add favorite
      const { teamName } = req.body;
      
      if (!teamName) {
        return res.status(400).json({
          success: false,
          error: 'Team name is required'
        });
      }

      await usersCollection.updateOne(
        { userId },
        { 
          $addToSet: { favorites: teamName },
          $set: { lastUpdated: new Date().toISOString() }
        },
        { upsert: true }
      );

      res.status(200).json({
        success: true,
        message: 'Favorite added successfully'
      });
      
    } else if (req.method === 'DELETE') {
      // Remove favorite
      const { teamName } = req.body;
      
      if (!teamName) {
        return res.status(400).json({
          success: false,
          error: 'Team name is required'
        });
      }

      await usersCollection.updateOne(
        { userId },
        { 
          $pull: { favorites: teamName },
          $set: { lastUpdated: new Date().toISOString() }
        }
      );

      res.status(200).json({
        success: true,
        message: 'Favorite removed successfully'
      });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User favorites API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process favorites',
      message: error.message
    });
  }
}
