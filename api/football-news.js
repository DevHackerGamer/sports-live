// /api/football-news.js
const { getFootballNewsCollection } = require('../lib/mongodb');

async function handler(req, res) {
  try {
    const newsCollection = await getFootballNewsCollection();

    // Handle GET requests
    if (req.method === 'GET') {
      const { leagueCode, limit = 20 } = req.query;

      const filter = leagueCode ? { leagueCode } : {};
      const news = await newsCollection
        .find(filter)
        .sort({ published: -1 })
        .limit(parseInt(limit))
        .toArray();

      return res.status(200).json(news);
    }

    // Handle DELETE (optional admin cleanup)
    if (req.method === 'DELETE') {
      const { leagueCode } = req.query;
      const result = await newsCollection.deleteMany(
        leagueCode ? { leagueCode } : {}
      );
      return res.status(200).json({ deletedCount: result.deletedCount });
    }

    // Unsupported method
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('Error in football-news API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = handler;
