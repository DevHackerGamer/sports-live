// API endpoint for league standings - MongoDB version
const { getStandingsCollection, getTeamsCollection } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

// GET /api/standings - List standings with filters
async function getStandings(req, res) {
  try {
    const { 
      competition,    // e.g. "BL1" or "Bundesliga"
      season,         // e.g. "2025"
      type,           // TOTAL, HOME, AWAY
      stage,          // REGULAR_SEASON, etc
      limit = 20
    } = req.query;

    const standingsCollection = await getStandingsCollection();

    // Build query
    const filter = {};
       if (competition && season) {
      filter._id = `${competition}-${season}`;
    } else {
      if (competition) {
        if (!isNaN(Number(competition))) {
          filter['competition.id'] = Number(competition);
        } else {
          filter.$or = [
            { 'competition.code': new RegExp(`^${competition}$`, 'i') },
            { 'competition.name': new RegExp(competition, 'i') }
          ];
        }
      }
      if (season) {
        // fallback fuzzy match by year in startDate (rarely used now)
        filter['season.startDate'] = new RegExp(season, 'i');
      }
    }
    if (type) filter['standings.type'] = type;
    if (stage) filter['standings.stage'] = stage;

    const docs = await standingsCollection
      .find(filter)
      .limit(parseInt(limit))
      .toArray();

    // Collect teams for crest enrichment
    const teamsCollection = await getTeamsCollection();
    const teamIds = new Set();
    docs.forEach(doc => {
      doc.standings?.forEach(s => {
        s.table?.forEach(row => {
          if (row.team?.id) teamIds.add(row.team.id);
        });
      });
    });

    const teamDocs = await teamsCollection
      .find({ id: { $in: Array.from(teamIds) } })
      .project({ id: 1, name: 1, crest: 1, tla: 1 })
      .toArray();

    const teamMap = new Map(teamDocs.map(t => [t.id, t]));

    // Enrich standings with crest
    const enriched = docs.map(doc => {
      const standings = (doc.standings || []).map(s => ({
        ...s,
        table: (s.table || []).map(row => {
          const tDoc = teamMap.get(row.team?.id);
          return {
            ...row,
            team: {
              ...row.team,
              crest: row.team?.crest || tDoc?.crest || undefined
            }
          };
        })
      }));
      return { ...doc, standings };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
      filters: { competition, season, type, stage, limit: parseInt(limit) },
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Standings fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch standings', message: err.message });
  }
}

// Main handler
async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const path = req.url.split('?')[0];
    const parts = path.split('/').filter(Boolean); // [api, standings, id?]
    const id = parts[2];

    const standingsCollection = await getStandingsCollection();

    if (req.method === 'GET') {
      if (!id) {
        return getStandings(req, res);
      }
      // GET /api/standings/:id → fetch one doc (e.g. "BL1-2025")
      const doc = await standingsCollection.findOne({ _id: id });
      if (!doc) return res.status(404).json({ success: false, error: 'Standings not found' });
      return res.status(200).json({ success: true, data: doc });
    }

    // Admin CRUD
    if (['POST','PUT','DELETE'].includes(req.method)) {
      const { isAdmin } = require('../lib/auth');
      if (!(await isAdmin(req))) {
        return res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        body.createdAt = new Date().toISOString();
        const result = await standingsCollection.insertOne(body);
        return res.status(201).json({ success: true, id: result.insertedId });
      }

      if (req.method === 'PUT' && id) {
        const updates = req.body || {};
        updates.lastUpdated = new Date().toISOString();
        const result = await standingsCollection.updateOne({ _id: id }, { $set: updates });
        if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Standings not found' });
        return res.status(200).json({ success: true, modified: result.modifiedCount > 0 });
      }

      if (req.method === 'DELETE' && id) {
        const result = await standingsCollection.deleteOne({ _id: id });
        return res.status(200).json({ success: true, deleted: result.deletedCount > 0 });
      }
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Standings API error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
}

module.exports = handler;
