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

    // Auto-correct legacy double-shifted admin matches (where utcDate stored with manual offset removal)
    const correctionOps = [];
    for (const m of matches) {
      if (m.createdByAdmin && m.date && m.time && m.utcDate) {
        const intendedLocal = new Date(`${m.date}T${m.time}`); // local original intent
        const intendedUtc = intendedLocal.toISOString();
        const storedMs = Date.parse(m.utcDate);
        const intendedMs = Date.parse(intendedUtc);
        if (!isNaN(storedMs) && !isNaN(intendedMs)) {
          const diffMin = Math.abs(storedMs - intendedMs) / 60000;
            // If difference is between 110 and 130 minutes (~2h DST variance) treat as legacy shift and fix in-memory & persist
            if (diffMin > 110 && diffMin < 130) {
              m.utcDate = intendedUtc;
              correctionOps.push({ updateOne: { filter: { id: m.id }, update: { $set: { utcDate: intendedUtc } } } });
            }
        }
      }
    }
    if (correctionOps.length) {
      try { await matchesCollection.bulkWrite(correctionOps, { ordered: false }); } catch(e){ console.warn('Legacy utcDate correction failed', e.message); }
    }

    // Auto-progress admin-created matches to IN_PLAY and compute minute
    const nowMs = Date.now();
    const bulkUpdates = [];
    for (const m of matches) {
      if (m?.createdByAdmin && (m.utcDate || (m.date && m.time))) {
        // Prefer original admin-entered local date+time to drive live clock to avoid timezone conversion drift
        let startMs;
        if (m.date && m.time) {
          const local = new Date(`${m.date}T${m.time}`); // interpret as local wall time
          startMs = local.getTime();
        } else {
          startMs = Date.parse(m.utcDate);
        }
        if (!isNaN(startMs)) {
          const diffMin = Math.floor((nowMs - startMs) / 60000);
          if (diffMin >= 0 && diffMin <= 90) {
            let changed = false;
            if (m.status !== 'IN_PLAY') { m.status = 'IN_PLAY'; changed = true; }
            const newMinute = Math.max(1, diffMin + 1);
            if (m.minute !== newMinute) { m.minute = newMinute; changed = true; }
            if (changed) {
              bulkUpdates.push({ updateOne: { filter: { id: m.id }, update: { $set: { status: m.status, minute: m.minute, lastUpdated: new Date() } } } });
            }
          } else if (diffMin > 90 && diffMin < 130) { // simple finalize window
            if (m.status !== 'FINISHED') {
              m.status = 'FINISHED';
              m.minute = 90;
              bulkUpdates.push({ updateOne: { filter: { id: m.id }, update: { $set: { status: 'FINISHED', minute: 90, lastUpdated: new Date() } } } });
            }
          }
        }
      }
    }
    if (bulkUpdates.length) {
      try { await matchesCollection.bulkWrite(bulkUpdates, { ordered: false }); } catch(e){ console.warn('Bulk minute/status update failed', e.message); }
    }

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
      // Backfill competition.code if absent but name contains bracketed code (e.g., "Premier League [PL]")
      if (out.competition && !out.competition.code && typeof out.competition.name === 'string') {
        const cm = /^(.*)\s*\[([A-Za-z0-9]+)\]$/.exec(out.competition.name);
        if (cm) {
          out.competition = { ...out.competition, name: cm[1].trim(), code: cm[2] };
        }
      }
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Type, X-User-Role');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Robust path parsing (supports optional trailing slash)
    const path = req.url.split('?')[0];
    const segments = path.replace(/\/+$/,'').split('/').filter(Boolean); // remove trailing slashes
    // Expected base: ['api','matches', ...]
    const parts = segments.slice(0); // clone
    const id = segments.length > 2 ? segments[2] : undefined;
    const sub = segments.length > 3 ? segments[3] : undefined; // e.g. 'events'
    const eventId = segments.length > 4 ? segments[4] : undefined;
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
      console.log('[matches] req', req.method, path, id?`id=${id}`:'');
    }

    const matchesCollection = await getMatchesCollection();

    // Helper: build a robust filter for an arbitrary id/string
    const buildIdQueries = (raw) => {
      const queries = [];
      if (!raw) return queries;
      const num = Number(raw);
      if (!isNaN(num)) queries.push({ id: num });
      if (ObjectId.isValid(raw)) {
        try { queries.push({ _id: new ObjectId(raw) }); } catch(_){}
      }
      // Always attempt string id field (covers admin-created a_* IDs)
      queries.push({ id: raw });
      return queries;
    };

    if (req.method === 'GET') {
      if (!id) {
        return getMatches(req, res);
      }

      const orFilters = buildIdQueries(id);
      const finalFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };

      if (sub === 'events') {
        const match = await matchesCollection.findOne(finalFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
        return res.status(200).json({ success: true, data: match.events || [] });
      }

      const match = await matchesCollection.findOne(finalFilter);
      if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
      if (match.createdByAdmin && (match.utcDate || (match.date && match.time))) {
        let startMs;
        if (match.date && match.time) {
          const local = new Date(`${match.date}T${match.time}`);
          startMs = local.getTime();
        } else {
          startMs = Date.parse(match.utcDate);
        }
        if (!isNaN(startMs)) {
          const diffMin = Math.floor((Date.now() - startMs)/60000);
          let changed = false;
            if (diffMin >= 0 && diffMin <= 90) {
              if (match.status !== 'IN_PLAY') { match.status = 'IN_PLAY'; changed = true; }
              const newMinute = Math.max(1, diffMin + 1);
              if (match.minute !== newMinute) { match.minute = newMinute; changed = true; }
            } else if (diffMin > 90 && diffMin < 130) {
              if (match.status !== 'FINISHED') { match.status = 'FINISHED'; match.minute = 90; changed = true; }
            }
          if (changed) {
            try { await matchesCollection.updateOne({ _id: match._id }, { $set: { status: match.status, minute: match.minute, lastUpdated: new Date() } }); } catch(e) {}
          }
        }
      }
      return res.status(200).json({ success: true, data: match });
    }

    if (req.method === 'POST') {
      // Admin-only actions
      const { isAdmin } = require('../lib/auth');
      const devHeader = req.headers['x-user-type'] || req.headers['x-user-role'];
      if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
        console.log('[matches] POST root', { hasBody: !!req.body });
      }
      if (!(await isAdmin(req))) {
        if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
          console.warn('[matches] forbid non-admin');
        }
        return res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      }
      // POST /api/matches -> create a new admin match (unified)
      if (!id) {
        const body = req.body || {};
        if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
          console.log('[matches] create payload', Object.keys(body));
        }
        // NOTE: date+time supplied by admin interpreted as LOCAL time and converted to UTC.
        // Older entries may have been stored with an artificial +offset (appending 'Z' directly).
        // Such legacy docs will appear shifted; consider running a one-off migration to realign.
  let { homeTeam, awayTeam, date, time, competition, competitionCode, utcDate } = body;
        if (!homeTeam || !awayTeam || !(utcDate || (date && time))) {
          return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        // Reject dates before today (local server date) when explicit date provided
        if (date) {
          const today = new Date();
          const todayY = today.getFullYear();
          const todayM = today.getMonth();
          const todayD = today.getDate();
          const provided = new Date(`${date}T00:00:00`);
          if (provided.getFullYear() < todayY ||
              (provided.getFullYear() === todayY && (provided.getMonth() < todayM || (provided.getMonth() === todayM && provided.getDate() < todayD)))) {
            return res.status(400).json({ success: false, error: 'Cannot create a match in the past' });
          }
        }
        if (typeof homeTeam === 'string') homeTeam = { id: homeTeam, name: homeTeam };
        if (typeof awayTeam === 'string') awayTeam = { id: awayTeam, name: awayTeam };
        const knownCodes = {
          'premier league': 'PL',
          'bundesliga': 'BL1',
          'serie a': 'SA',
          'la liga': 'PD',
          'ligue 1': 'FL1',
          'uefa champions league': 'CL'
        };
        if (!competition) {
          competition = { id: 'unknown', name: 'Unknown Competition', code: competitionCode || undefined };
        } else if (typeof competition === 'string') {
          // Allow admin to send "Premier League [PL]" inline; extract code if separate code not supplied
          const m = /^(.*)\s*\[([A-Za-z0-9]+)\]$/.exec(competition);
          if (m && !competitionCode) {
            competitionCode = m[2];
            competition = m[1].trim();
          }
          if (!competitionCode) {
            const key = competition.trim().toLowerCase();
            if (knownCodes[key]) competitionCode = knownCodes[key];
          }
          competition = { id: competition, name: competition, code: competitionCode || undefined };
        }
        let dtISO;
        if (utcDate) {
          dtISO = new Date(utcDate).toISOString();
        } else {
          // Interpret date+time as local and rely on JS toISOString (no manual offset math to avoid double shift)
          const localStart = new Date(`${date}T${time}`);
          dtISO = localStart.toISOString();
        }
        const now = new Date().toISOString();
        const inputDate = date || (utcDate ? new Date(utcDate).toISOString().slice(0,10) : null);
        const inputTime = time || (utcDate ? new Date(utcDate).toISOString().slice(11,16) : null);
        // Determine initial status/minute: if started (0-90 min ago) mark IN_PLAY with computed minute
        // Otherwise if start time is in the past but beyond 90m treat as FINISHED (simple assumption)
        let status = 'TIMED';
        let minute = undefined;
        const startMs = Date.parse(dtISO);
        const diffMin = (Date.now() - startMs) / 60000; // positive means already started
        if (!isNaN(diffMin)) {
          if (diffMin >= 0 && diffMin <= 90) {
            status = 'IN_PLAY';
            minute = Math.max(1, Math.floor(diffMin) + 1);
          } else if (diffMin > 90) {
            status = 'FINISHED';
            minute = 90;
          }
        }
        const newMatch = {
          id: body.id || `a_${Date.now().toString(36)}`,
          homeTeam,
          awayTeam,
          competition: { id: competition.id, name: competition.name, code: competition.code },
          utcDate: dtISO,
          date: inputDate,
          time: inputTime,
          status,
          minute,
          stage: 'REGULAR_SEASON',
          matchday: body.matchday || null,
          group: body.group || null,
          score: body.score || { fullTime: { home: null, away: null } },
          createdByAdmin: true,
          source: 'admin',
          createdAt: now,
          lastUpdated: now
        };
        await matchesCollection.insertOne(newMatch);
        if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
          console.log('[matches] inserted', newMatch.id);
        }
        return res.status(201).json({ success: true, data: newMatch });
      }
  // POST /api/matches/:id/events -> add event
      if (id && sub === 'events') {
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
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

      // Fallback: if body looks like a creation payload but earlier branch missed (edge path)
      const b = req.body || {};
      if (b.homeTeam && b.awayTeam) {
        if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
          console.log('[matches] fallback create');
        }
  let { homeTeam, awayTeam, date, time, competition, competitionCode, utcDate } = b;
        if (typeof homeTeam === 'string') homeTeam = { id: homeTeam, name: homeTeam };
        if (typeof awayTeam === 'string') awayTeam = { id: awayTeam, name: awayTeam };
        const knownCodes = {
          'premier league': 'PL',
          'bundesliga': 'BL1',
          'serie a': 'SA',
          'la liga': 'PD',
          'ligue 1': 'FL1',
          'uefa champions league': 'CL'
        };
        if (!competition) {
          competition = { id: 'unknown', name: 'Unknown Competition', code: competitionCode || undefined };
        } else if (typeof competition === 'string') {
          const m = /^(.*)\s*\[([A-Za-z0-9]+)\]$/.exec(competition);
          if (m && !competitionCode) {
            competitionCode = m[2];
            competition = m[1].trim();
          }
          if (!competitionCode) {
            const key = competition.trim().toLowerCase();
            if (knownCodes[key]) competitionCode = knownCodes[key];
          }
          competition = { id: competition, name: competition, code: competitionCode || undefined };
        }
        if (date) {
          const today = new Date();
          const todayY = today.getFullYear();
          const todayM = today.getMonth();
          const todayD = today.getDate();
          const provided = new Date(`${date}T00:00:00`);
          if (provided.getFullYear() < todayY ||
              (provided.getFullYear() === todayY && (provided.getMonth() < todayM || (provided.getMonth() === todayM && provided.getDate() < todayD)))) {
            return res.status(400).json({ success: false, error: 'Cannot create a match in the past' });
          }
        }
        let dtISO;
        if (utcDate) {
          dtISO = new Date(utcDate).toISOString();
        } else if (date && time) {
          const localStart = new Date(`${date}T${time}`);
          dtISO = localStart.toISOString();
        } else {
          dtISO = new Date().toISOString();
        }
        const now = new Date().toISOString();
        let status = 'TIMED';
        let minute = undefined;
        const startMs = Date.parse(dtISO);
        const diffMin = (Date.now() - startMs) / 60000;
        if (!isNaN(diffMin)) {
          if (diffMin >= 0 && diffMin <= 90) {
            status = 'IN_PLAY';
            minute = Math.max(1, Math.floor(diffMin) + 1);
          } else if (diffMin > 90) {
            status = 'FINISHED';
            minute = 90;
          }
        }
        const newMatch = {
          id: b.id || `a_${Date.now().toString(36)}`,
          homeTeam,
          awayTeam,
          competition: { id: competition.id, name: competition.name, code: competition.code },
          utcDate: dtISO,
          status,
          minute,
          stage: 'REGULAR_SEASON',
          matchday: b.matchday || null,
          group: b.group || null,
          score: b.score || { fullTime: { home: null, away: null } },
          createdByAdmin: true,
          source: 'admin',
          createdAt: now,
          lastUpdated: now
        };
        await matchesCollection.insertOne(newMatch);
        return res.status(201).json({ success: true, data: newMatch, fallback: true });
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
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
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
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const updates = req.body || {};
        updates.lastUpdated = new Date().toISOString();
        const result = await matchesCollection.updateOne(matchFilter, { $set: updates });
        if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Match not found' });
        return res.status(200).json({ success: true, modified: result.modifiedCount > 0 });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (req.method === 'DELETE') {
      // Admin-only: delete event or match
      const { isAdmin } = require('../lib/auth');
      if (!(await isAdmin(req))) {
        return res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      }
      if (id && sub === 'events' && eventId) {
        // DELETE /api/matches/:id/events/:eventId
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const result = await matchesCollection.updateOne(matchFilter, { $pull: { events: { id: eventId } } });
        if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Match not found' });
        return res.status(200).json({ success: true, deleted: result.modifiedCount > 0 });
      }
      if (id && !sub) {
        // DELETE /api/matches/:id -> delete an admin created match (only if createdByAdmin)
        const orFilters = buildIdQueries(id).map(f => ({ ...f, createdByAdmin: true }));
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const result = await matchesCollection.deleteOne(matchFilter);
        if (!result.deletedCount) return res.status(404).json({ success: false, error: 'Match not found or not admin-created' });
        return res.status(200).json({ success: true, deleted: true });
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
