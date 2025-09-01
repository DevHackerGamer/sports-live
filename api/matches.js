// API endpoint for matches - compatible with both Express and Vercel
const { getMatchesCollection, getTeamsCollection } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

// GET /api/matches - Get all matches with optional filters
async function getMatches(req, res) {
  try {
    const { 
      limit = 500, 
      status, 
      competition, 
      range = 10,
      includePast, // if truthy, include past N days instead of only upcoming
      dateFrom,
      dateTo
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
    
    // Date range filter: prioritize explicit dateFrom/dateTo when provided
    const normalizeDate = (str, end = false) => {
      if (!str) return null;
      // If only YYYY-MM-DD provided, assume UTC day boundaries
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y,m,d] = str.split('-').map(n => parseInt(n,10));
        const dt = end
          ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
          : new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        return dt.toISOString();
      }
      // Else, trust the input and convert
      const dt = new Date(str);
      return isNaN(dt.getTime()) ? null : dt.toISOString();
    };

    const dfISO = normalizeDate(dateFrom, false);
    const dtISO = normalizeDate(dateTo, true);
    if (dfISO || dtISO) {
      filter.utcDate = {};
      if (dfISO) filter.utcDate.$gte = dfISO;
      if (dtISO) filter.utcDate.$lte = dtISO;
    } else if (range) {
      // Default: show upcoming matches only (now-2h .. now+rangeDays)
      const days = parseInt(range);
      const now = new Date();
      const startDate = new Date(now);
      // Small grace window for in-progress or slightly delayed times
      startDate.setHours(startDate.getHours() - 2);
      let endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);

      if (includePast) {
        // Old behavior: last N days to next N days
        const pastStart = new Date(now);
        pastStart.setDate(pastStart.getDate() - days);
        filter.utcDate = {
          $gte: pastStart.toISOString(),
          $lte: endDate.toISOString()
        };
      } else {
        filter.utcDate = {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        };
      }
    }

    const matches = await matchesCollection
      .find(filter)
      .sort({ utcDate: 1 })
      .limit(parseInt(limit))
      .toArray();

  // Enrich with team crests from Teams collection
  const teamsCollection = await getTeamsCollection();
    const idSet = new Set();
    const nameSet = new Set();
    const tlaSet = new Set();
    const shortNameSet = new Set();
    for (const m of matches) {
      const h = m.homeTeam; const a = m.awayTeam;
      if (h && typeof h === 'object' && h.id) idSet.add(h.id);
      if (a && typeof a === 'object' && a.id) idSet.add(a.id);
      if (h && typeof h === 'string') nameSet.add(h);
      if (a && typeof a === 'string') nameSet.add(a);
      if (h && typeof h === 'object' && h.name) nameSet.add(h.name);
      if (a && typeof a === 'object' && a.name) nameSet.add(a.name);
      if (h && typeof h === 'object' && h.tla) tlaSet.add((h.tla||'').toUpperCase());
      if (a && typeof a === 'object' && a.tla) tlaSet.add((a.tla||'').toUpperCase());
      if (h && typeof h === 'object' && h.shortName) shortNameSet.add(h.shortName);
      if (a && typeof a === 'object' && a.shortName) shortNameSet.add(a.shortName);
    }

    const ids = Array.from(idSet);
    const names = Array.from(nameSet);
  const byId = new Map();
  const byName = new Map();
  const byTla = new Map();
  const byShort = new Map();
    if (ids.length) {
      const docs = await teamsCollection.find({ id: { $in: ids } }).project({ id:1, name:1, crest:1, tla:1 }).toArray();
      for (const d of docs) byId.set(d.id, d);
    }
    if (names.length) {
      const docs = await teamsCollection.find({ name: { $in: names } }).project({ id:1, name:1, crest:1, tla:1 }).toArray();
      for (const d of docs) byName.set((d.name||'').toLowerCase(), d);
    }
    const tlas = Array.from(tlaSet);
    if (tlas.length) {
      const docs = await teamsCollection.find({ tla: { $in: tlas } }).project({ id:1, name:1, crest:1, tla:1, shortName:1 }).toArray();
      for (const d of docs) byTla.set((d.tla||'').toUpperCase(), d);
    }
    const shorts = Array.from(shortNameSet);
    if (shorts.length) {
      const docs = await teamsCollection.find({ shortName: { $in: shorts } }).project({ id:1, name:1, crest:1, tla:1, shortName:1 }).toArray();
      for (const d of docs) byShort.set((d.shortName||'').toLowerCase(), d);
    }

    const enriched = matches.map(m => {
      const out = { ...m };
      const h = m.homeTeam; const a = m.awayTeam;
      const hDoc = (h && typeof h === 'object' && h.id && byId.get(h.id))
        || (h && typeof h === 'object' && h.tla && byTla.get((h.tla||'').toUpperCase()))
        || (h && byName.get((h.name||h).toString().toLowerCase()))
        || (h && typeof h === 'object' && h.shortName && byShort.get((h.shortName||'').toLowerCase()));
      const aDoc = (a && typeof a === 'object' && a.id && byId.get(a.id))
        || (a && typeof a === 'object' && a.tla && byTla.get((a.tla||'').toUpperCase()))
        || (a && byName.get((a.name||a).toString().toLowerCase()))
        || (a && typeof a === 'object' && a.shortName && byShort.get((a.shortName||'').toLowerCase()));
      if (h && typeof h === 'object') out.homeTeam = { ...h, crest: h.crest || hDoc?.crest || hDoc?.logo || hDoc?.crestUrl || undefined };
      if (a && typeof a === 'object') out.awayTeam = { ...a, crest: a.crest || aDoc?.crest || aDoc?.logo || aDoc?.crestUrl || undefined };
      if (typeof h === 'string') out.homeTeam = { name: h, crest: hDoc?.crest || hDoc?.logo || hDoc?.crestUrl };
      if (typeof a === 'string') out.awayTeam = { name: a, crest: aDoc?.crest || aDoc?.logo || aDoc?.crestUrl };
      return out;
    });

    res.status(200).json({
      success: true,
      data: enriched,
      count: matches.length,
  filters: { status, competition, range: parseInt(range), limit: parseInt(limit), includePast: !!includePast, dateFrom: dateFrom||null, dateTo: dateTo||null },
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
