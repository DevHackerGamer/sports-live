// /api/football-highlights.js
const { getFootballHighlightsCollection } = require('../lib/mongodb');

async function handler(req, res) {
  try {
    const collection = await getFootballHighlightsCollection();
    const { leagueName } = req.query;

    let query = {};
    if (leagueName) query.leagueName = leagueName;

    const highlights = await collection
      .find(query)
      .sort({ publishedAt: -1 })
      .limit(12)
      .toArray();

    res.status(200).json(highlights);
  } catch (err) {
    console.error('Error fetching highlights:', err);
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
}

module.exports = handler;
