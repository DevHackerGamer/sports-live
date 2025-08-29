// Vercel serverless function for matches API
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
    const matchesCollection = db.collection('Matches');

    if (req.method === 'GET') {
      const matches = await matchesCollection.find({}).toArray();
      
      res.status(200).json({
        success: true,
        data: matches,
        count: matches.length,
        lastUpdated: new Date().toISOString()
      });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Matches API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: error.message
    });
  }
}
