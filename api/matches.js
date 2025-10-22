// API endpoint for matches - compatible with both Express and Vercel
const { 
  getMatchesCollection, 
  getMatchesCollectionESPN, 
  getMatchesCollectionADMIN,
  getTeamsCollection, 
  getDatabase 
} = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
// ESPN live provider (read-time) utilities
const {
  fetchScoreboard: espnFetchScoreboard,
  fetchSummary: espnFetchSummary,
  fetchPlayByPlay: espnFetchPlayByPlay
} = require('../services/espnProvider');

// Canonicalize event type strings to a controlled set
function canonicalEventType(raw) {
  if (!raw) return 'other';
  const t = String(raw).toLowerCase().trim();
  const map = {
    goal: 'goal',
    penalty: 'penalty',
    penaltygoal: 'penalty',
    'penalty goal': 'penalty',
    owngoal: 'own_goal',
    own_goal: 'own_goal',
    yellow: 'yellow_card',
    yellowcard: 'yellow_card',
    red: 'red_card',
    redcard: 'red_card',
    yellowred: 'second_yellow',
    secondyellow: 'second_yellow',
    substitution: 'substitution',
    sub: 'substitution',
    injury: 'injury',
    foul: 'foul',
    corner: 'corner_kick',
    cornerkick: 'corner_kick',
    freekick: 'free_kick',
    free_kick: 'free_kick',
    offside: 'offside',
    save: 'save',
    halftime: 'half_time',
    half_time: 'half_time',
    match_end: 'match_end',
    matchend: 'match_end',
    match_start: 'match_start',
    kickoff: 'match_start'
  };
  return map[t] || t || 'other';
}

// Determine if an event type affects the score (and how)
function isScoringEvent(type) {
  const t = canonicalEventType(type);
  return t === 'goal' || t === 'penalty' || t === 'own_goal';
}

// Compute aggregate score from a list of normalized events
function tallyScoreFromEvents(events = [], match) {
  let home = 0;
  let away = 0;
  const homeName = (match?.homeTeam?.name || match?.homeTeam || '').toString().toLowerCase();
  const awayName = (match?.awayTeam?.name || match?.awayTeam || '').toString().toLowerCase();
  for (const ev of events) {
    const base = canonicalEventType(ev.type || ev?.data?.type);
    if (!isScoringEvent(base)) continue;
    // teamSide may be on root or data
    let side = ev.teamSide || ev?.data?.teamSide || '';
    if (side !== 'home' && side !== 'away') {
      const teamLc = (ev.team || ev?.data?.team || ev?.data?.teamName || '').toString().toLowerCase();
      if (teamLc === 'home' || (homeName && teamLc === homeName)) side = 'home';
      else if (teamLc === 'away' || (awayName && teamLc === awayName)) side = 'away';
      else side = '';
    }
    if (!side) continue;
    if (base === 'own_goal') {
      if (side === 'home') away += 1; else home += 1;
    } else {
      if (side === 'home') home += 1; else away += 1;
    }
  }
  return { home, away };
}

// Recompute and persist rolling scoreAfter on Event_Log for a given match
async function recomputeEventLogScores(match, db) {
  if (!db) db = await getDatabase();
  const eventLog = db.collection('Event_Log');
  const matchId = match.id || match._id?.toString();
  if (!matchId) return;
  const docs = await eventLog.find({ $or: [ { matchId }, { matchId: String(matchId) }, { 'data.matchId': matchId } ] })
    .sort({ 'data.minute': 1, timestamp: 1 })
    .toArray();
  let rolling = { home: 0, away: 0 };
  for (const doc of docs) {
    const base = canonicalEventType(doc.type || doc?.data?.type);
    if (isScoringEvent(base)) {
      // Infer side
      let side = doc?.data?.teamSide || '';
      if (side !== 'home' && side !== 'away') {
        const teamLc = (doc?.data?.team || doc?.data?.teamName || '').toString().toLowerCase();
        const h = (match?.homeTeam?.name || match?.homeTeam || '').toString().toLowerCase();
        const a = (match?.awayTeam?.name || match?.awayTeam || '').toString().toLowerCase();
        if (teamLc === 'home' || (h && teamLc === h)) side = 'home';
        else if (teamLc === 'away' || (a && teamLc === a)) side = 'away';
        else side = '';
      }
      if (side) {
        if (base === 'own_goal') {
          if (side === 'home') rolling.away += 1; else rolling.home += 1;
        } else {
          if (side === 'home') rolling.home += 1; else rolling.away += 1;
        }
      }
    }
    // Persist a snapshot of score after this event
    try {
      await eventLog.updateOne({ _id: doc._id }, { $set: { scoreAfter: { home: rolling.home, away: rolling.away } } });
    } catch (_) {}
  }
  // Update match document mirror for quick reads
  const matchesCollection = await getMatchesCollection();
  try {
    await matchesCollection.updateOne(
      { $or: [ { id: match.id }, { _id: match._id } ] },
      { $set: { 'score.fullTime.home': rolling.home, 'score.fullTime.away': rolling.away, homeScore: rolling.home, awayScore: rolling.away, lastUpdated: new Date() } }
    );
  } catch (_) {}
}

function buildDescription(ev) {
  if (ev.description) return ev.description;
  const base = canonicalEventType(ev.type);
  const labelMap = {
    goal: 'Goal',
    penalty: 'Penalty Goal',
    own_goal: 'Own Goal',
    yellow_card: 'Yellow Card',
    red_card: 'Red Card',
    second_yellow: 'Second Yellow',
    substitution: 'Substitution',
    injury: 'Injury',
    foul: 'Foul',
    corner_kick: 'Corner Kick',
    free_kick: 'Free Kick',
    offside: 'Offside',
    save: 'Save',
    half_time: 'Half Time',
    match_end: 'Full Time',
    match_start: 'Kick Off'
  };
  const label = labelMap[base] || 'Event';
  const parts = [label];
  if (ev.team) parts.push(ev.team);
  if (ev.player) parts.push(ev.player);
  return parts.join(' - ');
}

// Normalize an event object (both incoming and when returning to clients)
function normalizeEvent(ev = {}) {
  const out = { ...ev };
  out.type = canonicalEventType(out.type || out.eventType || out.kind);
  // minute inference
  if ((out.minute == null || out.minute === '') && out.time) {
    const m = parseInt(String(out.time).split(':')[0], 10);
    if (!isNaN(m)) out.minute = m; else out.minute = 0;
  }
  if (out.minute == null && typeof out.time === 'string' && /^\d+$/.test(out.time)) {
    out.minute = parseInt(out.time, 10);
  }
  if (typeof out.minute !== 'number') {
    const num = parseInt(out.minute, 10);
    out.minute = isNaN(num) ? 0 : num;
  }
  // ensure id & createdAt
  out.id = out.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  out.createdAt = out.createdAt || new Date().toISOString();
  // substitution player formatting (keep original playerOut/In but provide player aggregate)
  if (out.type === 'substitution' && !out.player && (out.playerOut || out.playerIn)) {
    out.player = `${out.playerOut || ''}${out.playerOut && out.playerIn ? ' → ' : ''}${out.playerIn || ''}`;
  }
  out.description = buildDescription(out);
  return out;
}

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
      dateTo,
      provider,
      league,
      adminOnly // if truthy, only return admin-created matches
    } = req.query;

  const readProvider = (provider || process.env.READ_PROVIDER || 'espn-db').toLowerCase();
    if (readProvider === 'espn') {
      // Live passthrough from ESPN scoreboard, normalized to our match shape, no DB dependency
      const leagues = (league
        ? String(league).split(',').map(s => s.trim()).filter(Boolean)
        : (process.env.ESPN_LEAGUES ? process.env.ESPN_LEAGUES.split(',').map(s=>s.trim()).filter(Boolean) : ['eng.1','esp.1','ita.1','ger.1','fra.1','uefa.champions']));
      const all = [];
      for (const lg of leagues) {
        try {
          const sb = await espnFetchScoreboard(lg);
          const events = Array.isArray(sb?.events) ? sb.events : [];
          for (const ev of events) {
            const comp = Array.isArray(ev.competitions) ? ev.competitions[0] : ev;
            const competitors = comp?.competitors || [];
            const home = competitors.find(c=>c.homeAway==='home') || competitors[0] || {};
            const away = competitors.find(c=>c.homeAway==='away') || competitors[1] || {};
            const mapComp = (c) => {
              const t = c?.team || {};
              const logos = Array.isArray(t.logos) ? t.logos : [];
              return {
                id: t.id || c.id,
                name: t.displayName || t.name || c?.displayName || c?.name,
                shortName: t.shortDisplayName || t.shortName,
                tla: t.abbreviation,
                crest: logos[0]?.href || t.logo
              };
            };
            const homeTeam = mapComp(home);
            const awayTeam = mapComp(away);
            const state = comp?.status?.type?.state || ev?.status?.type?.state;
            const mapStatus = (s) => {
              const t = String(s||'').toLowerCase();
              if (t === 'pre') return 'TIMED';
              if (t === 'in') return 'IN_PLAY';
              if (t === 'post') return 'FINISHED';
              return s || 'SCHEDULED';
            };
            const minuteFromClock = (disp) => {
              if (!disp) return undefined;
              const s = String(disp);
              let m;
              let m1 = /^(\d{1,3})'\+(\d{1,2})$/.exec(s);
              if (m1) return Math.min(120, parseInt(m1[1],10)+parseInt(m1[2],10));
              m1 = /^(\d{1,3})'?$/.exec(s); if (m1) return Math.min(120, parseInt(m1[1],10));
              m1 = /^(\d{1,2}):(\d{2})$/.exec(s); if (m1) return Math.min(120, parseInt(m1[1],10));
              return undefined;
            };
            const minute = minuteFromClock(comp?.status?.displayClock || comp?.status?.type?.shortDetail || comp?.status?.type?.detail);
            const utcDate = ev?.date || comp?.date || ev?.startDate;
            const homeScore = Number(home?.score ?? 0);
            const awayScore = Number(away?.score ?? 0);
            const competitionName = (comp?.league || ev?.league)?.name || lg;
            all.push({
              id: String(ev.id),
              homeTeam,
              awayTeam,
              competition: { id: competitionName, name: competitionName, code: lg },
              utcDate: utcDate ? new Date(utcDate).toISOString() : undefined,
              status: mapStatus(state),
              minute,
              matchday: comp?.round?.number || null,
              stage: comp?.type?.name || 'REGULAR_SEASON',
              group: comp?.group || null,
              score: { fullTime: { home: homeScore, away: awayScore } },
              source: 'espn',
              lastUpdated: new Date()
            });
          }
        } catch (e) {
          // continue other leagues
        }
      }
      // Optional: filter by status/competition like original
      let data = all;
      if (status) data = data.filter(m => String(m.status).toUpperCase() === String(status).toUpperCase());
      if (competition) data = data.filter(m => new RegExp(competition,'i').test(m?.competition?.name || ''));
      // Optional: apply dateFrom/dateTo
      const toISO = (str, end=false) => {
        if (!str) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [y,m,d]=str.split('-').map(n=>parseInt(n,10));
          const dt = end ? new Date(Date.UTC(y,m-1,d,23,59,59,999)) : new Date(Date.UTC(y,m-1,d,0,0,0,0));
          return dt.toISOString();
        }
        const dt=new Date(str); return isNaN(dt.getTime())?null:dt.toISOString();
      };
      const df = toISO(dateFrom,false); const dt = toISO(dateTo,true);
      if (df || dt) {
        data = data.filter(m => {
          const t = m.utcDate ? Date.parse(m.utcDate) : NaN;
          if (isNaN(t)) return false;
          if (df && t < Date.parse(df)) return false;
          if (dt && t > Date.parse(dt)) return false;
          return true;
        });
      }
      data.sort((a,b)=>String(a.utcDate||'').localeCompare(String(b.utcDate||'')));
      return res.status(200).json({ success: true, data: data.slice(0, parseInt(limit)), count: data.length, provider: 'espn' });
    }

    // Select DB based on provider (espn-db reads from ESPN cache tables only)
    let matchesCollection;
    
    if (readProvider === 'espn-db') {
      matchesCollection = await getMatchesCollectionESPN();
    } else if (readProvider === 'admin') {
      matchesCollection = await getMatchesCollectionADMIN();
    } else {
      matchesCollection = await getMatchesCollection();
    }
    
    // Ensure helpful indexes for fast queries
    try { 
      await matchesCollection.createIndex({ id: 1 });
      await matchesCollection.createIndex({ utcDate: 1 });
      await matchesCollection.createIndex({ status: 1 });
      await matchesCollection.createIndex({ 'competition.name': 1 });
      await matchesCollection.createIndex({ createdByAdmin: 1 });
    } catch(_) {}
    
    // Build filter
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (competition) {
      // Support filtering by both competition.name and competition.code
      filter.$or = [
        { 'competition.name': new RegExp(competition, 'i') },
        { 'competition.code': new RegExp(`^${competition}$`, 'i') }
      ];
    }
    
    // Filter for admin-created matches only
    if (adminOnly && ['1', 'true', 'yes', 'y'].includes(String(adminOnly).toLowerCase())) {
      filter.createdByAdmin = true;
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

    let matches = await matchesCollection
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
      if (m?.createdByAdmin) {
        // If a persistent clock exists, use it as source of truth
        if (m.clock && (typeof m.clock.elapsed === 'number' || m.clock.startedAt)) {
          const baseElapsed = Math.max(0, Math.floor(m.clock.elapsed || 0));
          const runningBonus = (m.clock.running && m.clock.startedAt)
            ? Math.max(0, Math.floor((nowMs - Date.parse(m.clock.startedAt)) / 1000))
            : 0;
          const totalElapsed = baseElapsed + runningBonus; // seconds
          const newMinute = Math.floor(totalElapsed / 60);
          let newStatus = m.status;
          if (m.clock.running) newStatus = 'IN_PLAY';
          else if (totalElapsed > 0) newStatus = 'PAUSED';
          else newStatus = m.status || 'TIMED';
          let changed = false;
          if (m.minute !== newMinute) { m.minute = newMinute; changed = true; }
          if (m.status !== newStatus) { m.status = newStatus; changed = true; }
          if (changed) {
            bulkUpdates.push({ updateOne: { filter: { id: m.id }, update: { $set: { status: m.status, minute: m.minute, lastUpdated: new Date() } } } });
          }
        } else if (m.utcDate || (m.date && m.time)) {
          // Legacy fallback: derive from scheduled start only if no clock set
          let startMs;
          if (m.date && m.time) {
            const local = new Date(`${m.date}T${m.time}`);
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
            } else if (diffMin > 90) {
              if (m.status !== 'FINISHED' || m.minute !== 90) {
                m.status = 'FINISHED';
                m.minute = 90;
                bulkUpdates.push({ updateOne: { filter: { id: m.id }, update: { $set: { status: 'FINISHED', minute: 90, lastUpdated: new Date() } } } });
              }
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

    // Derive scores from Event_Log when missing
    try {
      const needs = enriched.filter(m => (m?.score?.fullTime?.home ?? m?.homeScore) == null || (m?.score?.fullTime?.away ?? m?.awayScore) == null || m.homeScore === '-' || m.awayScore === '-');
      if (needs.length) {
        const ids = needs.map(m => m.id);
        const idsStr = ids.map(v => (typeof v === 'string' ? v : String(v)));
        const db = await getDatabase();
        const eventLog = db.collection('Event_Log');
        const goalTypes = ['goal','penalty','own_goal'];
        const evs = await eventLog.find({
          $and: [
            { $or: [ { matchId: { $in: ids } }, { matchId: { $in: idsStr } }, { 'data.matchId': { $in: ids } }, { 'data.matchId': { $in: idsStr } } ] },
            { $or: [ { type: { $in: goalTypes } }, { 'data.type': { $in: goalTypes } } ] }
          ]
        }).project({ matchId:1, type:1, data:1 }).toArray();
        const byMatch = new Map();
        const toKey = (x) => (typeof x === 'string' ? x : String(x));
        for (const m of needs) byMatch.set(toKey(m.id), { home: 0, away: 0, ref: m });
        const inferSide = (e, m) => {
          const side = e?.data?.teamSide;
          if (side === 'home' || side === 'away') return side;
          const teamLc = (e?.data?.team || e?.data?.teamName || '').toString().toLowerCase();
          const h = (m?.homeTeam?.name || m?.homeTeam || '').toString().toLowerCase();
          const a = (m?.awayTeam?.name || m?.awayTeam || '').toString().toLowerCase();
          if (teamLc === 'home' || (h && teamLc === h)) return 'home';
          if (teamLc === 'away' || (a && teamLc === a)) return 'away';
          return '';
        };
        for (const ev of evs) {
          const key = toKey(ev.matchId || ev?.data?.matchId);
          const agg = byMatch.get(key);
          if (!agg) continue;
          const base = canonicalEventType(ev.type || ev?.data?.type);
          if (!['goal','penalty','own_goal'].includes(base)) continue;
          const side = inferSide(ev, agg.ref);
          if (!side) continue;
          if (base === 'own_goal') {
            if (side === 'home') agg.away += 1; else agg.home += 1;
          } else {
            if (side === 'home') agg.home += 1; else agg.away += 1;
          }
        }
        for (const [_, agg] of byMatch) {
          const m = agg.ref;
          if (agg.home || agg.away) {
            m.score = m.score || { fullTime: { home: null, away: null } };
            m.score.fullTime = m.score.fullTime || { home: null, away: null };
            m.score.fullTime.home = agg.home;
            m.score.fullTime.away = agg.away;
            m.homeScore = agg.home;
            m.awayScore = agg.away;
          }
        }
      }
    } catch (e) {
      console.warn('Score derivation (list) failed:', e.message);
    }

    res.status(200).json({
      success: true,
      data: enriched,
      count: matches.length,
      provider: readProvider, // Include provider so client knows which collection was queried
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
  const readProvider = (req.query.provider || process.env.READ_PROVIDER || 'espn-db').toLowerCase();
      const provider = (req.query.provider || process.env.READ_PROVIDER || '').toLowerCase();
      // ESPN live read: match list and event timeline without DB dependency
      if (!id && readProvider === 'espn') {
        return getMatches(req, res);
      }

      if (!id) {
        return getMatches(req, res);
      }

      const orFilters = buildIdQueries(id);
      const finalFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('[matches] GET single id=%s filter=%j', id, finalFilter); } catch(_){ }
      }

  if (sub === 'events') {
        if (readProvider === 'espn') {
          let league = req.query.league || null;
          const wantSignificant = ['1','true','yes','y'].includes(String(req.query.significant||'').toLowerCase());
          const defaults = (process.env.ESPN_LEAGUES ? process.env.ESPN_LEAGUES.split(',').map(s=>s.trim()).filter(Boolean) : ['eng.1','esp.1','ita.1','ger.1','fra.1','uefa.champions']);
          try {
            // Try to detect league if not provided by probing summary across defaults
            let summary = null;
            if (!league) {
              for (const lg of defaults) {
                try { summary = await espnFetchSummary(lg, id); league = lg; if (summary?.header) break; } catch(_) {}
              }
              if (!league) league = defaults[0];
            } else {
              try { summary = await espnFetchSummary(league, id); } catch(_) { summary = null; }
            }
            // Fetch summary to derive team sides
            let teamSide = {};
            let teamById = {};
            try {
              const comp = Array.isArray(summary?.header?.competitions) ? summary.header.competitions[0] : {};
              const competitors = comp?.competitors || [];
              const h = competitors.find(c=>c.homeAway==='home') || competitors[0];
              const a = competitors.find(c=>c.homeAway==='away') || competitors[1];
              if (h?.team?.displayName) teamSide[String(h.team.displayName).toLowerCase()] = 'home';
              if (a?.team?.displayName) teamSide[String(a.team.displayName).toLowerCase()] = 'away';
              // Build id->meta map
              for (const c of competitors) {
                const tid = c?.team?.id ? String(c.team.id) : undefined;
                if (tid) teamById[tid] = { name: c.team.displayName || c.team.name, side: c.homeAway };
              }
            } catch(_) {}
            // Helpers for Core mapping
            const idFromRef = (ref) => {
              if (!ref) return undefined;
              const s = typeof ref === 'string' ? ref : (ref.$ref || '');
              const m = /(teams|competitors)\/(\d+)/.exec(s);
              return m ? m[2] : undefined;
            };
            const minFromClockCore = (disp) => {
              if (!disp) return undefined; const s=String(disp);
              let m=/^(\d{1,3})'\+(\d{1,2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10)+parseInt(m[2],10));
              m=/^(\d{1,3})'?$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10));
              m=/^(\d{1,2}):(\d{2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10));
              return undefined;
            };
            const canonicalCore = (raw) => {
              const typeId = raw?.type?.id || raw?.type?.text || raw?.type || raw?.playTypeId || raw?.playType;
              const t = String(typeId||raw?.text||'').toLowerCase();
              const map = (x)=>{
                if(/(goal)/.test(x)) return 'goal';
                if(/pen(alt)?y/.test(x)) return 'penalty';
                if(/own\s*goal/.test(x)) return 'own_goal';
                if(/yellow/.test(x) && !/second/.test(x)) return 'yellow_card';
                if(/second.*yellow/.test(x)) return 'second_yellow';
                if(/red/.test(x)) return 'red_card';
                if(/sub(s|tit)/.test(x)) return 'substitution';
                if(/kick\s*off|start/.test(x)) return 'match_start';
                if(/half.*time/.test(x)) return 'half_time';
                if(/full.*time|end/.test(x)) return 'match_end';
                if(/offside/.test(x)) return 'offside';
                if(/corner/.test(x)) return 'corner_kick';
                if(/free\s*kick/.test(x)) return 'free_kick';
                if(/foul/.test(x)) return 'foul';
                if(/save/.test(x)) return 'save';
                if(/shot\s*on\s*target/.test(x)) return 'shot_on_target';
                if(/shot\s*off\s*target/.test(x)) return 'shot_off_target';
                return x;
              };
              return map(t);
            };
            // Significant timeline via Core plays when requested
            if (wantSignificant) {
              try {
                const { fetchCoreEvent, fetchCoreCollectionAll } = require('../services/espnProvider');
                const core = await fetchCoreEvent(league, id);
                const playsUrl = core?.comp?.details?.$ref || core?.comp?.details;
                const col = await fetchCoreCollectionAll(playsUrl);
                const items = Array.isArray(col?.items) ? col.items : [];
                const keepType = new Set([
                  'goal','penalty','own_goal','yellow_card','red_card','second_yellow','substitution',
                  'offside','corner_kick','free_kick','foul','save','match_start','half_time','match_end',
                  'shot_on_target','shot_off_target'
                ]);
                const filtered = items.filter(p => {
                  const t = canonicalCore(p);
                  const sig = keepType.has(t) || p.scoringPlay === true || p.priority === true || p.redCard || p.yellowCard || p.penaltyKick || p.ownGoal;
                  return sig;
                });
                const list = filtered.map((p, idx) => {
                  const t = canonicalCore(p);
                  const time = p?.clock?.displayValue || '';
                  const minute = minFromClockCore(time);
                  let teamId = idFromRef(p?.team?.$ref || p?.team);
                  if (!teamId && Array.isArray(p?.participants) && p.participants[0]?.team) teamId = idFromRef(p.participants[0].team);
                  const teamMeta = teamId && teamById[teamId] ? teamById[teamId] : undefined;
                  const desc = p?.text || p?.shortText || p?.alternativeText || p?.shortAlternativeText || (p?.type?.text || '');
                  return {
                    id: p?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    type: t,
                    time,
                    minute,
                    team: teamMeta?.name,
                    teamSide: teamMeta?.side,
                    player: undefined,
                    description: desc
                  };
                });
                // Sort soccer-aware
                const parseParts = (tStr)=>{
                  const s=(tStr||'').toString().replace(/[’′`´]/g,"'").replace(/\s+/g,'');
                  let m=/^(\d{1,3})'?\+(\d{1,2})'?$/.exec(s); if(m) return { base: parseInt(m[1],10), plus: parseInt(m[2],10) };
                  m=/^(\d{1,3})'?$/.exec(s); if(m) return { base: parseInt(m[1],10), plus: 0 };
                  m=/^(\d{1,2}):(\d{2})$/.exec(s); if(m) return { base: parseInt(m[1],10), plus: 0 };
                  return { base: NaN, plus: 0 };
                };
                const phaseRank = (ev)=>{
                  const tStr = ev.time||''; const { base, plus } = parseParts(tStr);
                  const txt=(ev.description||'').toLowerCase(); const tp=(ev.type||'').toLowerCase(); const comb = `${tp} ${txt}`;
                  if(/kick\s*off|match_start/.test(comb)) return [0, -1, 0];
                  if(/half\s*time/.test(comb)) return [3, 0, 0];
                  if(/start\s*of\s*second\s*half|second\s*half\s*begins/.test(comb)) return [4, -1, 0];
                  if(/full\s*time|match_end|end\s*of\s*match/.test(comb)) return [6, 0, 0];
                  if(!isNaN(base)) {
                    if (base <= 45) return [plus>0?2:1, base, plus];
                    if (base <= 90) return [plus>0?5:4, base, plus];
                    if (base <= 105) return [plus>0?8:7, base, plus];
                    if (base <= 120) return [plus>0?10:9, base, plus];
                  }
                  return [11, 0, 0];
                };
                list.sort((a,b)=>{
                  const ak=phaseRank(a), bk=phaseRank(b);
                  for(let i=0;i<3;i++){ if(ak[i]<bk[i]) return -1; if(ak[i]>bk[i]) return 1; }
                  return 0;
                });
                return res.status(200).json({ success: true, data: list, provider: 'espn', mode: 'significant' });
              } catch (e) {
                return res.status(500).json({ success: false, error: 'Failed to fetch ESPN Core plays', message: e.message });
              }
            }
            // Fetch play-by-play (site) and combine with core
            let commentary = [];
            try {
              const pbp = await espnFetchPlayByPlay(league, id);
              commentary = pbp?.commentary || pbp?.plays || [];
            } catch(_) {}
            // Fallback: some games expose commentary/plays in summary
            if (!Array.isArray(commentary) || commentary.length === 0) {
              const alt = summary?.commentary || summary?.plays || [];
              if (Array.isArray(alt) && alt.length) commentary = alt;
            }
            // Also fetch Core API plays/commentaries across ALL pages and merge/dedupe
            try {
              const { fetchCoreEvent, fetchCoreCollectionAll, normalizeCoreCommentary } = require('../services/espnProvider');
              const core = await fetchCoreEvent(league, id);
              const teamSideMap2 = { ...teamSide };
              if (!Object.keys(teamSideMap2).length) {
                const compComps = Array.isArray(core?.comp?.competitors) ? core.comp.competitors : [];
                for (const c of compComps) {
                  const name = c?.team?.displayName || c?.team?.name;
                  const side = c?.homeAway;
                  if (name && (side==='home'||side==='away')) teamSideMap2[String(name).toLowerCase()] = side;
                }
              }
              const allPlays = core?.comp?.details ? await fetchCoreCollectionAll(core.comp.details.$ref || core.comp.details) : null;
              const allComm = core?.comp?.commentaries ? await fetchCoreCollectionAll(core.comp.commentaries.$ref || core.comp.commentaries) : null;
              const det = allPlays && Array.isArray(allPlays.items) ? { items: allPlays.items } : core?.details;
              const com = allComm && Array.isArray(allComm.items) ? { items: allComm.items } : core?.commentaries;
              const coreEvents = normalizeCoreCommentary(det, com, teamSideMap2) || [];
              if (Array.isArray(coreEvents) && coreEvents.length) {
                const combined = [...(Array.isArray(commentary)?commentary:[]), ...coreEvents];
                const seen = new Set(); const merged = [];
                for (const c of combined) { const key = c?.id || `${c?.text||''}|${c?.clock?.displayValue||c?.time||''}`; if (seen.has(key)) continue; seen.add(key); merged.push(c); }
                commentary = merged;
              }
            } catch(_) {}
            // Normalize a bit: id, type, clock, team, athlete, text → our minimal shape
            const minuteFromClock = (disp) => {
              if (!disp) return undefined; const s=String(disp);
              let m=/^(\d{1,3})'\+(\d{1,2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10)+parseInt(m[2],10));
              m=/^(\d{1,3})'?$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10));
              m=/^(\d{1,2}):(\d{2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10));
              return undefined;
            };
            const canonical = (raw) => {
              const typeId = raw?.type?.id || raw?.type?.text || raw?.type || raw?.playTypeId || raw?.playType;
              const t = String(typeId||raw?.text||'').toLowerCase();
              const map = (x)=>{
                if(/(goal)/.test(x)) return 'goal';
                if(/pen(alt)?y/.test(x)) return 'penalty';
                if(/own\s*goal/.test(x)) return 'own_goal';
                if(/yellow/.test(x) && !/second/.test(x)) return 'yellow_card';
                if(/second.*yellow/.test(x)) return 'second_yellow';
                if(/red/.test(x)) return 'red_card';
                if(/sub(s|tit)/.test(x)) return 'substitution';
                if(/kick\s*off|start/.test(x)) return 'match_start';
                if(/half.*time/.test(x)) return 'half_time';
                if(/full.*time|end/.test(x)) return 'match_end';
                if(/offside/.test(x)) return 'offside';
                if(/corner/.test(x)) return 'corner_kick';
                if(/free\s*kick/.test(x)) return 'free_kick';
                if(/foul/.test(x)) return 'foul';
                if(/save/.test(x)) return 'save';
                return x;
              };
              return map(t);
            };
            const list = commentary.map(c => ({
              id: c?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
              type: canonical(c),
              time: c?.clock?.displayValue,
              minute: minuteFromClock(c?.clock?.displayValue),
              team: c?.team?.displayName,
              teamSide: c?.team?.displayName ? teamSide[String(c.team.displayName).toLowerCase()] : undefined,
              player: c?.athlete?.displayName,
              description: c?.text
            }));
            return res.status(200).json({ success: true, data: list, provider: 'espn' });
          } catch (e) {
            return res.status(500).json({ success: false, error: 'Failed to fetch ESPN commentary', message: e.message });
          }
        }
  const match = await matchesCollection.findOne(finalFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
        let list = Array.isArray(match.events) ? match.events : [];
        if (!list.length) {
          try {
            const db = await getDatabase();
            const eventLog = db.collection('Event_Log');
            const mid = match.id || match._id?.toString();
            const logs = await eventLog.find({ $or: [ { matchId: mid }, { 'data.matchId': mid } ] }).sort({ timestamp: 1 }).toArray();
            list = logs.map(l => ({ ...l.data, type: l.type, description: l.message }));
          } catch(_) {}
          // If still empty: by default, return fast with empty list (no live fetch). Only allow slow live ESPN when explicitly requested.
          const allowLive = ['1','true','yes','y'].includes(String(req.query.allowLive||'').toLowerCase());
          if ((!list || !list.length) && allowLive && (String(match?.source||'').toLowerCase() === 'espn' || match?.competition?.code)) {
            try {
              const lg = match?.competition?.code || (process.env.ESPN_LEAGUES || '').split(',')[0] || 'ita.1';
              // Reuse the same ESPN read path logic: summary + playbyplay + core fallback
              const { fetchSummary: espnSum, fetchPlayByPlay: espnPbp, fetchCoreEvent, normalizeCoreCommentary } = require('../services/espnProvider');
              let teamSide = {};
              try {
                const summary = await espnSum(lg, match.id);
                const comp = Array.isArray(summary?.header?.competitions) ? summary.header.competitions[0] : {};
                const competitors = comp?.competitors || [];
                const h = competitors.find(c=>c.homeAway==='home') || competitors[0];
                const a = competitors.find(c=>c.homeAway==='away') || competitors[1];
                if (h?.team?.displayName) teamSide[String(h.team.displayName).toLowerCase()] = 'home';
                if (a?.team?.displayName) teamSide[String(a.team.displayName).toLowerCase()] = 'away';
                let comm = [];
                try { const pbp = await espnPbp(lg, match.id); comm = pbp?.commentary || pbp?.plays || []; } catch(_) {}
                if (!Array.isArray(comm) || !comm.length) {
                  const alt = summary?.commentary || summary?.plays || [];
                  if (Array.isArray(alt) && alt.length) comm = alt;
                }
                // Always also fetch Core and merge to ensure freshness
                try {
                  const core = await fetchCoreEvent(lg, match.id);
                  if (!Object.keys(teamSide).length) {
                    const compComps = Array.isArray(core?.comp?.competitors) ? core.comp.competitors : [];
                    for (const c of compComps) {
                      const name = c?.team?.displayName || c?.team?.name; const side = c?.homeAway;
                      if (name && (side==='home'||side==='away')) teamSide[String(name).toLowerCase()] = side;
                    }
                  }
                  const coreEvents = normalizeCoreCommentary(core?.details, core?.commentaries, teamSide) || [];
                  const combined = [...(Array.isArray(comm)?comm:[]), ...coreEvents];
                  const seen = new Set(); const merged = [];
                  for (const c of combined) { const key = c?.id || `${c?.text||''}|${c?.clock?.displayValue||c?.time||''}`; if (seen.has(key)) continue; seen.add(key); merged.push(c); }
                  comm = merged;
                } catch(_) {}
                // Normalize to our event shape minimal
                const minuteFromClock = (disp) => {
                  if (!disp) return undefined; const s=String(disp);
                  let m=/^(\d{1,3})'\+(\d{1,2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10)+parseInt(m[2],10));
                  m=/^(\d{1,3})'?$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10));
                  m=/^(\d{1,2}):(\d{2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10));
                  return undefined;
                };
                const canonical = (raw) => {
                  const typeId = raw?.type?.id || raw?.type?.text || raw?.type || raw?.playTypeId || raw?.playType;
                  const t = String(typeId||raw?.text||'').toLowerCase();
                  const map = (x)=>{
                    if(/(goal)/.test(x)) return 'goal';
                    if(/pen(alt)?y/.test(x)) return 'penalty';
                    if(/own\s*goal/.test(x)) return 'own_goal';
                    if(/yellow/.test(x) && !/second/.test(x)) return 'yellow_card';
                    if(/second.*yellow/.test(x)) return 'second_yellow';
                    if(/red/.test(x)) return 'red_card';
                    if(/sub(s|tit)/.test(x)) return 'substitution';
                    if(/kick\s*off|start/.test(x)) return 'match_start';
                    if(/half.*time/.test(x)) return 'half_time';
                    if(/full.*time|end/.test(x)) return 'match_end';
                    if(/offside/.test(x)) return 'offside';
                    if(/corner/.test(x)) return 'corner_kick';
                    if(/free\s*kick/.test(x)) return 'free_kick';
                    if(/foul/.test(x)) return 'foul';
                    if(/save/.test(x)) return 'save';
                    return x;
                  };
                  return map(t);
                };
                list = Array.isArray(comm) ? comm.map(c => ({
                  id: c?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                  type: canonical(c),
                  time: c?.clock?.displayValue || c?.time,
                  minute: minuteFromClock(c?.clock?.displayValue || c?.time),
                  team: c?.team?.displayName,
                  teamSide: c?.team?.displayName ? teamSide[String(c.team.displayName).toLowerCase()] : c?.teamSide,
                  player: c?.athlete?.displayName || c?.player,
                  description: c?.text || c?.description
                })) : [];
              } catch(_) {}
            } catch(_) {}
          }
        }
        return res.status(200).json({ success: true, data: list });
      }

  if (readProvider === 'espn') {
        const league = req.query.league || (process.env.ESPN_LEAGUES || '').split(',')[0] || 'ita.1';
        try {
          const summary = await espnFetchSummary(league, id);
          // Build a normalized minimal match object from header + boxscore
          const header = summary?.header || {};
          const comp = Array.isArray(header?.competitions) ? header.competitions[0] : {};
          const competitors = comp?.competitors || [];
          const home = competitors.find(c=>c.homeAway==='home') || competitors[0] || {};
          const away = competitors.find(c=>c.homeAway==='away') || competitors[1] || {};
          const mapTeam = (c) => ({
            id: c?.team?.id,
            name: c?.team?.displayName || c?.team?.name,
            shortName: c?.team?.shortDisplayName,
            tla: c?.team?.abbreviation,
            crest: Array.isArray(c?.team?.logos)&&c.team.logos[0]?c.team.logos[0].href:c?.team?.logo
          });
          const mapStatus = (s)=>{ const t=String(s||'').toLowerCase(); if(t==='pre') return 'TIMED'; if(t==='in') return 'IN_PLAY'; if(t==='post') return 'FINISHED'; return s||'SCHEDULED'; };
          const minFromClock = (disp)=>{ if(!disp) return undefined; const s=String(disp); let m=/^(\d{1,3})'\+(\d{1,2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10)+parseInt(m[2],10)); m=/^(\d{1,3})'?$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10)); m=/^(\d{1,2}):(\d{2})$/.exec(s); if(m) return Math.min(120,parseInt(m[1],10)); return undefined; };
          const matchOut = {
            id: String(id),
            homeTeam: mapTeam(home),
            awayTeam: mapTeam(away),
            competition: { id: comp?.league?.name || league, name: comp?.league?.name || league, code: league },
            utcDate: comp?.date ? new Date(comp.date).toISOString() : undefined,
            status: mapStatus(comp?.status?.type?.state),
            minute: minFromClock(comp?.status?.displayClock || comp?.status?.type?.shortDetail || comp?.status?.type?.detail),
            score: { fullTime: { home: Number(home?.score ?? 0), away: Number(away?.score ?? 0) } },
            source: 'espn',
            lastUpdated: new Date()
          };
          return res.status(200).json({ success: true, data: matchOut, provider: 'espn' });
        } catch (e) {
          return res.status(500).json({ success: false, error: 'Failed to fetch ESPN summary', message: e.message });
        }
      }

  // Choose collection based on provider
  const useEspnDb = (readProvider === 'espn-db');
  const matchesCollectionSingle = useEspnDb ? await getMatchesCollectionESPN() : matchesCollection;
    // Ensure fast lookup on id
    try { await matchesCollectionSingle.createIndex({ id: 1 }); } catch(_) {}
  const match = await matchesCollectionSingle.findOne(finalFilter);
      if (!match && process.env.NODE_ENV !== 'production') {
        try {
          const sample = await matchesCollection.find({ id: /a_/ }).project({ id:1 }).limit(5).toArray();
          console.warn('[matches] GET not found id=%s existing sample ids=%j', id, sample.map(s=>s.id));
        } catch(_){}
      }
      if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
      // If scores are missing, optionally derive from Event_Log (guarded by deriveScore=true to avoid slow scans)
      const deriveScore = ['1','true','yes','y'].includes(String(req.query.deriveScore||'').toLowerCase());
      try {
        const h = match?.score?.fullTime?.home ?? match?.homeScore;
        const a = match?.score?.fullTime?.away ?? match?.awayScore;
        if (deriveScore && (h == null || h === '-' || a == null || a === '-')) {
          const db = await getDatabase();
          const eventLog = db.collection('Event_Log');
          // Helpful indexes
          try { await eventLog.createIndex({ matchId: 1 }); } catch(_) {}
          try { await eventLog.createIndex({ 'data.matchId': 1 }); } catch(_) {}
          try { await eventLog.createIndex({ type: 1 }); } catch(_) {}
          const goalTypes = ['goal','penalty','own_goal'];
          const evs = await eventLog.find({
            $and: [
              { $or: [ { matchId: match.id }, { matchId: String(match.id) }, { 'data.matchId': match.id }, { 'data.matchId': String(match.id) } ] },
              { $or: [ { type: { $in: goalTypes } }, { 'data.type': { $in: goalTypes } } ] }
            ]
          }).project({ type:1, data:1 }).toArray();
          let home = 0, away = 0;
          const homeName = (match?.homeTeam?.name || match?.homeTeam || '').toString().toLowerCase();
          const awayName = (match?.awayTeam?.name || match?.awayTeam || '').toString().toLowerCase();
          for (const ev of evs) {
            const base = canonicalEventType(ev.type || ev?.data?.type);
            if (!goalTypes.includes(base)) continue;
            let side = ev?.data?.teamSide;
            if (side !== 'home' && side !== 'away') {
              const teamLc = (ev?.data?.team || ev?.data?.teamName || '').toString().toLowerCase();
              if (teamLc === 'home' || (homeName && teamLc === homeName)) side = 'home';
              else if (teamLc === 'away' || (awayName && teamLc === awayName)) side = 'away';
              else side = '';
            }
            if (!side) continue;
            if (base === 'own_goal') {
              if (side === 'home') away += 1; else home += 1;
            } else {
              if (side === 'home') home += 1; else away += 1;
            }
          }
          if (home || away) {
            match.score = match.score || { fullTime: { home: null, away: null } };
            match.score.fullTime = match.score.fullTime || { home: null, away: null };
            match.score.fullTime.home = home;
            match.score.fullTime.away = away;
            match.homeScore = home;
            match.awayScore = away;
          }
        }
      } catch (e) {
        console.warn('Score derivation (single) failed:', e.message);
      }

      // Prefer persisted clock if present for admin-created matches
      if (match.createdByAdmin && match.clock && (typeof match.clock.elapsed === 'number' || match.clock.startedAt)) {
        const nowMs = Date.now();
        const baseElapsed = Math.max(0, Math.floor(match.clock.elapsed || 0));
        const runningBonus = (match.clock.running && match.clock.startedAt) ? Math.max(0, Math.floor((nowMs - Date.parse(match.clock.startedAt)) / 1000)) : 0;
        const totalElapsed = baseElapsed + runningBonus;
        const newMinute = Math.floor(totalElapsed / 60);
        let newStatus = match.clock.running ? 'IN_PLAY' : (totalElapsed > 0 ? 'PAUSED' : (match.status || 'TIMED'));
        let changed = false;
        if (match.minute !== newMinute) { match.minute = newMinute; changed = true; }
        if (match.status !== newStatus) { match.status = newStatus; changed = true; }
        if (changed) {
          try { await matchesCollection.updateOne({ _id: match._id }, { $set: { status: match.status, minute: match.minute, lastUpdated: new Date() } }); } catch(e) {}
        }
      } else if (match.createdByAdmin && (match.utcDate || (match.date && match.time))) {
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
            } else if (diffMin > 90) {
              // Always finalize once we've passed 90 minutes; cap minute at 90 to avoid misleading huge values
              if (match.status !== 'FINISHED' || match.minute !== 90) { match.status = 'FINISHED'; match.minute = 90; changed = true; }
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
        
        // Admin matches: Insert into BOTH _ADMIN and _ESPN collections for faster querying
        const matchesCollectionADMIN = await getMatchesCollectionADMIN();
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        
        await Promise.all([
          matchesCollectionADMIN.insertOne({ ...newMatch }),
          matchesCollectionESPN.insertOne({ ...newMatch })
        ]);
        
        if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_MATCHES) {
          console.log('[matches] inserted admin match to ESPN collection', newMatch.id);
        }
        return res.status(201).json({ success: true, data: newMatch });
      }
  // POST /api/matches/:id/events -> add event
  if (id && sub === 'events') {
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const match = await matchesCollectionESPN.findOne(matchFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

  const event = req.body || {};
  // Lenient validation: coerce missing fields instead of rejecting to support admin quick-add
  let rawType = (event.type || '').toString().trim();
  const rawPlayer = (event.player || '').toString().trim();
  let rawDesc = (event.description || '').toString().trim();
  const rawTeam = (event.team || event.teamName || '').toString().trim();
  if (!rawType) rawType = 'other';
        // Derive a minute if absent using match minute (live) or fallback 0
        let derivedMinute = event.minute;
        if (derivedMinute == null) {
          if (typeof match.minute === 'number' && match.minute > 0) derivedMinute = match.minute;
          else if (event.time) {
            const m = parseInt(String(event.time).split(':')[0],10); if (!isNaN(m)) derivedMinute = m; else derivedMinute = 0;
          } else derivedMinute = 0;
        }
        const preliminary = {
          id: event.id,
          type: rawType || rawDesc, // may be refined in normalizeEvent
          minute: derivedMinute,
          time: event.time,
          team: rawTeam,
          teamSide: event.teamSide,
          player: rawPlayer,
          playerOut: event.playerOut,
          playerIn: event.playerIn,
          description: rawDesc
        };
        if (!preliminary.description) {
          // Synthesize a useful description if missing
          preliminary.description = buildDescription({ type: preliminary.type, team: preliminary.team, player: preliminary.player });
        }
        const newEvent = normalizeEvent(preliminary);
        
        // Update ESPN collection only (admin matches are only in ESPN)
        await matchesCollectionESPN.updateOne(matchFilter, { $push: { events: newEvent } });

        // Also persist to Event_Log collection (canonical log)
        try {
          const db = await getDatabase();
          const eventLog = db.collection('Event_Log');
          // Compute a safer minute for log display (avoid 0 when possible)
          let logMinute = newEvent.minute;
          if ((logMinute == null || logMinute === 0) && match.utcDate) {
            const startMs = Date.parse(match.utcDate);
            if (!isNaN(startMs)) {
              const diff = Math.floor((Date.now() - startMs)/60000);
              if (diff > 0 && diff <= 130) logMinute = diff; // simple inference
            }
          }
          // Compose base event log doc
          const baseDoc = {
            timestamp: new Date(),
            type: newEvent.type,
            message: newEvent.description,
            data: { ...newEvent, displayMinute: logMinute, matchId: match.id || match._id?.toString() },
            source: 'match_event_api',
            matchId: match.id || match._id?.toString()
          };
          // If scoring, we will recompute snapshots after insert
          const ins = await eventLog.insertOne(baseDoc);
          if (isScoringEvent(newEvent.type)) {
            await recomputeEventLogScores(match, db);
          } else {
            // For non-scoring events we still compute scoreAfter = current derived score
            try {
              const { home, away } = tallyScoreFromEvents([baseDoc], match);
              await eventLog.updateOne({ _id: ins.insertedId }, { $set: { scoreAfter: { home, away } } });
            } catch(_) {}
          }
        } catch(e) {
          console.warn('Failed to insert into Event_Log:', e.message);
        }
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
        
        // Insert into both ADMIN and ESPN collections
        const matchesCollectionADMIN = await getMatchesCollectionADMIN();
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        await Promise.all([
          matchesCollectionADMIN.insertOne({ ...newMatch }),
          matchesCollectionESPN.insertOne({ ...newMatch })
        ]);
        
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
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const match = await matchesCollectionESPN.findOne(matchFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
        const updates = req.body || {};
        const updateFields = {};
        for (const k of ['type', 'time', 'minute', 'team', 'teamSide', 'player', 'playerOut', 'playerIn', 'description']) {
          if (updates[k] !== undefined) updateFields[`events.$.${k}`] = updates[k];
        }
        
        // Update ESPN collection only (admin matches are only in ESPN)
        const result = await matchesCollectionESPN.updateOne({ ...matchFilter, 'events.id': eventId }, { $set: updateFields });
        
        if (!result.matchedCount) {
          return res.status(404).json({ success: false, error: 'Event or match not found' });
        }
        
        // Mirror to Event_Log and recompute scores
        try {
          const db = await getDatabase();
          const eventLog = db.collection('Event_Log');
          const matchId = match.id || match._id?.toString();
          await eventLog.updateMany({ $and: [
            { $or: [ { matchId }, { matchId: String(matchId) } ] },
            { $or: [ { 'data.id': eventId }, { 'data.eventId': eventId } ] }
          ] }, { $set: { ...(updates.type ? { type: canonicalEventType(updates.type) } : {}), 'data': { ...updates, id: eventId, matchId } } });
          await recomputeEventLogScores(match, db);
        } catch (_) {}
        return res.status(200).json({ success: true, modified: result.modifiedCount > 0 });
      }

      if (id && !sub) {
        // PUT /api/matches/:id -> update match details (e.g., referee, venue, statistics)
        const matchesCollectionADMIN = await getMatchesCollectionADMIN();
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const updates = req.body || {};
        // Normalize and handle clock updates from client (LiveInput)
        // Expected shape: { clock: { running: bool, elapsed: seconds, startedAt?: ISO }, status?, minute? }
        if (updates.clock) {
          const c = updates.clock;
          const norm = { running: !!c.running };
          if (typeof c.elapsed === 'number' && c.elapsed >= 0) norm.elapsed = Math.floor(c.elapsed);
          if (c.startedAt) {
            const t = Date.parse(c.startedAt);
            if (!isNaN(t)) norm.startedAt = new Date(t).toISOString();
          } else if (norm.running) {
            norm.startedAt = new Date().toISOString();
          }
          updates.clock = norm;
          // Also reflect computed status/minute for quick reads
          const nowMs = Date.now();
          const baseElapsed = Math.max(0, Math.floor(norm.elapsed || 0));
          const runningBonus = (norm.running && norm.startedAt) ? Math.max(0, Math.floor((nowMs - Date.parse(norm.startedAt)) / 1000)) : 0;
          const totalElapsed = baseElapsed + runningBonus;
          updates.minute = Math.floor(totalElapsed / 60);
          updates.status = norm.running ? 'IN_PLAY' : (totalElapsed > 0 ? 'PAUSED' : 'TIMED');
        }
        updates.lastUpdated = new Date().toISOString();
        
        // Update both ADMIN and ESPN collections
        const results = await Promise.all([
          matchesCollectionADMIN.updateOne(matchFilter, { $set: updates }),
          matchesCollectionESPN.updateOne(matchFilter, { $set: updates })
        ]);
        
        if (!results[0].matchedCount && !results[1].matchedCount) {
          return res.status(404).json({ success: false, error: 'Match not found' });
        }
        return res.status(200).json({ success: true, modified: results[0].modifiedCount > 0 || results[1].modifiedCount > 0 });
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
        const matchesCollectionADMIN = await getMatchesCollectionADMIN();
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        
        // For admin matches, check both collections
        const orFilters = buildIdQueries(id);
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        const match = await matchesCollectionADMIN.findOne(matchFilter) || await matchesCollectionESPN.findOne(matchFilter);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
        
        // Delete event from both ADMIN and ESPN collections
        const results = await Promise.all([
          matchesCollectionADMIN.updateOne(matchFilter, { $pull: { events: { id: eventId } } }),
          matchesCollectionESPN.updateOne(matchFilter, { $pull: { events: { id: eventId } } })
        ]);
        
        if (!results[0].matchedCount && !results[1].matchedCount) {
          return res.status(404).json({ success: false, error: 'Match not found' });
        }
        
        // Also remove from Event_Log and recompute
        try {
          const db = await getDatabase();
          const eventLog = db.collection('Event_Log');
          const matchId = match.id || match._id?.toString();
          await eventLog.deleteMany({ $and: [
            { $or: [ { matchId }, { matchId: String(matchId) } ] },
            { $or: [ { 'data.id': eventId }, { 'data.eventId': eventId } ] }
          ] });
          await recomputeEventLogScores(match, db);
        } catch(_) {}
        return res.status(200).json({ success: true, deleted: results[0].modifiedCount > 0 || results[1].modifiedCount > 0 });
      }
      if (id && !sub) {
        // DELETE /api/matches/:id -> delete an admin created match (only if createdByAdmin)
        const matchesCollectionADMIN = await getMatchesCollectionADMIN();
        const matchesCollectionESPN = await getMatchesCollectionESPN();
        const orFilters = buildIdQueries(id).map(f => ({ ...f, createdByAdmin: true }));
        const matchFilter = orFilters.length === 1 ? orFilters[0] : { $or: orFilters };
        
        // Delete from both ADMIN and ESPN collections
        const results = await Promise.all([
          matchesCollectionADMIN.deleteOne(matchFilter),
          matchesCollectionESPN.deleteOne(matchFilter)
        ]);
        
        if (!results[0].deletedCount && !results[1].deletedCount) {
          return res.status(404).json({ success: false, error: 'Match not found or not admin-created' });
        }
        
        // Also delete associated match statistics from both collections
        try {
          const db = await getDatabase();
          const statsCollectionADMIN = db.collection('Match_Statistics_ADMIN');
          const statsCollectionESPN = db.collection('Match_Statistics_ESPN');
          const matchId = id;
          await Promise.all([
            statsCollectionADMIN.deleteOne({ matchId }),
            statsCollectionESPN.deleteOne({ matchId })
          ]);
          console.log(`Deleted match statistics for match ${matchId} from ADMIN and ESPN collections`);
        } catch (error) {
          console.error('Error deleting match statistics:', error);
          // Don't fail the match deletion if statistics deletion fails
        }
        
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