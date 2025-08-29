// Vercel serverless function for teams API
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
  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.DATABASE_NAME || 'SportsLiveTrackerDB');
    const teamsCollection = db.collection('Teams');

    if (req.method === 'GET') {
      const teams = await teamsCollection.find({}).toArray();
      
      res.status(200).json({
        success: true,
        data: teams,
        count: teams.length,
        lastUpdated: new Date().toISOString()
      });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Teams API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams',
      message: error.message
    });
  }
}
