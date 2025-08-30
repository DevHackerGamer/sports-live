// API endpoint for matches - compatible with both Express and Vercel
const { getMatchesCollection } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

// GET /api/matches - Get all matches with optional filters
async function getMatches(req, res) {
  try {
    const { 
      limit = 100, 
      status, 
      competition, 
      range = 7 
    } = req.query;

    const matchesCollection = await getMatchesCollection();
    
    // Build filter
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (competition) {
      filter['competition.name'] = new RegExp(competition, 'i');
    }
    
    // Date range filter (default: last 7 days to next 7 days)
    if (range) {
      const days = parseInt(range);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      
      filter.utcDate = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      };
    }

    const matches = await matchesCollection
      .find(filter)
      .sort({ utcDate: 1 })
      .limit(parseInt(limit))
      .toArray();
    
    res.status(200).json({
      success: true,
      data: matches,
      count: matches.length,
      filters: { status, competition, range: parseInt(range), limit: parseInt(limit) },
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
    // Parse path after /api/matches
    const path = req.url.split('?')[0];
    const parts = path.split('/').filter(Boolean); // [api, matches, :id?, events?, :eventId?]
    const id = parts[2];
    const sub = parts[3]; // 'events' or undefined
    const eventId = parts[4];

    const matchesCollection = await getMatchesCollection();

    if (req.method === 'GET') {
      if (!id) {
        return getMatches(req, res);
      }

      // GET /api/matches/:id
      const matchIdNum = isNaN(Number(id)) ? null : Number(id);
      const matchFilter = matchIdNum !== null ? { id: matchIdNum } : { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };

      if (sub === 'events') {
        // GET /api/matches/:id/events
        const match = await matchesCollection.findOne(matchFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
        return res.status(200).json({ success: true, data: match.events || [] });
      }

      const match = await matchesCollection.findOne(matchFilter);
      if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
      return res.status(200).json({ success: true, data: match });
    }

    if (req.method === 'POST') {
      // Admin-only: add event
      const { isAdmin } = require('../lib/auth');
      if (!(await isAdmin(req))) {
        return res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      }
      // POST /api/matches/:id/events -> add event
      if (id && sub === 'events') {
        const matchIdNum = isNaN(Number(id)) ? null : Number(id);
        const matchFilter = matchIdNum !== null ? { id: matchIdNum } : { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
        const match = await matchesCollection.findOne(matchFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

        const event = req.body || {};
        // Ensure required fields
        const newEvent = {
          id: event.id || `${Date.now()}`,
          type: event.type || 'other',
          time: event.time || event.minute || '',
          minute: event.minute || undefined,
          team: event.team || '',
          player: event.player || '',
          description: event.description || '',
          createdAt: new Date().toISOString(),
        };

        await matchesCollection.updateOne(matchFilter, { $push: { events: newEvent } });
        return res.status(201).json({ success: true, data: newEvent });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (req.method === 'PUT') {
      // Admin-only: update event or match
      const { isAdmin } = require('../lib/auth');
      if (!(await isAdmin(req))) {
        return res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      }
      if (id && sub === 'events' && eventId) {
        // PUT /api/matches/:id/events/:eventId -> update event
        const matchIdNum = isNaN(Number(id)) ? null : Number(id);
        const matchFilter = matchIdNum !== null ? { id: matchIdNum } : { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
        const updates = req.body || {};
        const updateFields = {};
        for (const k of ['type', 'time', 'minute', 'team', 'player', 'description']) {
          if (updates[k] !== undefined) updateFields[`events.$.${k}`] = updates[k];
        }
        const result = await matchesCollection.updateOne({ ...matchFilter, 'events.id': eventId }, { $set: updateFields });
        if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Event or match not found' });
        return res.status(200).json({ success: true, modified: result.modifiedCount > 0 });
      }

      if (id && !sub) {
        // PUT /api/matches/:id -> update match details (e.g., referee, venue, statistics)
        const matchIdNum = isNaN(Number(id)) ? null : Number(id);
        const matchFilter = matchIdNum !== null ? { id: matchIdNum } : { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
        const updates = req.body || {};
        updates.lastUpdated = new Date().toISOString();
        const result = await matchesCollection.updateOne(matchFilter, { $set: updates });
        if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Match not found' });
        return res.status(200).json({ success: true, modified: result.modifiedCount > 0 });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (req.method === 'DELETE') {
      // Admin-only: delete event
      const { isAdmin } = require('../lib/auth');
      if (!(await isAdmin(req))) {
        return res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      }
      if (id && sub === 'events' && eventId) {
        // DELETE /api/matches/:id/events/:eventId
        const matchIdNum = isNaN(Number(id)) ? null : Number(id);
        const matchFilter = matchIdNum !== null ? { id: matchIdNum } : { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
        const result = await matchesCollection.updateOne(matchFilter, { $pull: { events: { id: eventId } } });
        if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Match not found' });
        return res.status(200).json({ success: true, deleted: result.modifiedCount > 0 });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Fallback
    res.status(405).json({ success: false, error: 'Method not allowed' });
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
