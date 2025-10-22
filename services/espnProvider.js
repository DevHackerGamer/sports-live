// ESPN Provider: fetches soccer data from public ESPN site APIs and writes to MongoDB
// Endpoints used:
// - Scoreboard: https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard
// - Summary:   https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event={eventId}
// - PlayByPlay: https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/playbyplay?event={eventId}

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const {
  getDatabase,
  getMatchesCollection,
  getMatchesCollectionESPN,
  getTeamsCollection,
  getTeamsCollectionESPN,
  getMatchLineupsCollection,
  getMatchLineupsCollectionESPN,
  getMatchCommentaryCollection,
  getMatchCommentaryCollectionESPN
} = require('../lib/mongodb');

const DEFAULT_LEAGUES = [
  'eng.1', // Premier League
  'esp.1', // La Liga
  'ita.1', // Serie A
  'ger.1', // Bundesliga
  'fra.1', // Ligue 1
  'uefa.champions'
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Map ESPN status.state to our status
function mapStatus(state) {
  const t = String(state || '').toLowerCase();
  if (t === 'pre') return 'TIMED';
  if (t === 'in') return 'IN_PLAY';
  if (t === 'post') return 'FINISHED';
  return state || 'SCHEDULED';
}

function parseIsoDate(d) {
  try { return new Date(d).toISOString(); } catch { return null; }
}

function minuteFromClock(displayClock) {
  if (!displayClock) return undefined;
  // Accept formats like "45'", "45'+2", "90'+5", "12:34"
  const s = String(displayClock);
  const stoppage = /^(\d{1,3})'\+(\d{1,2})$/.exec(s);
  if (stoppage) {
    return Math.min(120, parseInt(stoppage[1], 10) + parseInt(stoppage[2], 10));
  }
  const base = /^(\d{1,3})'?$/.exec(s);
  if (base) return Math.min(120, parseInt(base[1], 10));
  const mmss = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (mmss) return Math.min(120, parseInt(mmss[1], 10));
  return undefined;
}

function canonicalEventType(raw) {
  if (!raw) return 'other';
  const t = String(raw).toLowerCase();
  // ESPN types vary; normalize common ids/texts
  if (/(goal)/.test(t)) return 'goal';
  if (/pen(alt)?y/.test(t)) return 'penalty';
  if (/own\s*goal/.test(t)) return 'own_goal';
  if (/yellow/.test(t) && !/second/.test(t)) return 'yellow_card';
  if (/second.*yellow/.test(t)) return 'second_yellow';
  if (/red/.test(t)) return 'red_card';
  if (/sub(s|tit)/.test(t)) return 'substitution';
  if (/kick\s*off|start/.test(t)) return 'match_start';
  if (/half.*time/.test(t)) return 'half_time';
  if (/full.*time|end/.test(t)) return 'match_end';
  if (/offside/.test(t)) return 'offside';
  if (/corner/.test(t)) return 'corner_kick';
  if (/free\s*kick/.test(t)) return 'free_kick';
  if (/foul/.test(t)) return 'foul';
  if (/save/.test(t)) return 'save';
  return t;
}

function buildDescription(ev) {
  if (ev.description) return ev.description;
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
  const label = labelMap[ev.type] || 'Event';
  const parts = [label];
  if (ev.team) parts.push(ev.team);
  if (ev.player) parts.push(ev.player);
  return parts.join(' - ');
}

function normalizeEvent(raw, teamSideMap) {
  const out = {};
  const typeId = raw?.type?.id || raw?.type?.text || raw?.type || raw?.playTypeId || raw?.playType;
  out.type = canonicalEventType(typeId || raw?.text);
  out.time = raw?.clock?.displayValue || raw?.minute || undefined;
  const minute = minuteFromClock(out.time);
  out.minute = minute == null ? (typeof raw?.minute === 'number' ? raw.minute : undefined) : minute;
  out.team = raw?.team?.displayName || raw?.team?.name || undefined;
  const side = teamSideMap[(out.team || '').toLowerCase()];
  if (side === 'home' || side === 'away') out.teamSide = side;
  out.player = raw?.athlete?.displayName || raw?.athlete?.name || undefined;
  out.description = raw?.text || buildDescription(out);
  out.id = raw?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  out.createdAt = new Date().toISOString();
  return out;
}

function mapCompetitor(comp) {
  const t = comp?.team || {};
  const logos = Array.isArray(t.logos) ? t.logos : [];
  return {
    id: t.id || comp.id || undefined,
    name: t.displayName || t.name || comp?.displayName || comp?.name,
    shortName: t.shortDisplayName || t.shortName || undefined,
    tla: t.abbreviation || undefined,
    crest: logos[0]?.href || t.logo || undefined
  };
}

function deriveScoreFromCompetitors(competitors) {
  const home = competitors?.find(c => (c.homeAway || c.order) === 'home') || competitors?.[0];
  const away = competitors?.find(c => (c.homeAway || c.order) === 'away') || competitors?.[1];
  const homeScore = Number(home?.score ?? 0);
  const awayScore = Number(away?.score ?? 0);
  return { homeScore, awayScore };
}

async function upsertTeams(competitors) {
  try {
    const coll = await getTeamsCollection();
    const collESPN = await getTeamsCollectionESPN();
    const ops = [];
    const opsEspn = [];
    for (const c of competitors || []) {
      const t = c.team || {};
      const doc = {
        id: t.id || c.id,
        name: t.displayName || t.name,
        shortName: t.shortDisplayName || t.shortName,
        tla: t.abbreviation,
        crest: Array.isArray(t.logos) && t.logos[0] ? t.logos[0].href : t.logo,
        lastUpdated: new Date()
      };
      if (!doc.id || !doc.name) continue;
      ops.push({ updateOne: { filter: { id: doc.id }, update: { $set: doc }, upsert: true } });
      opsEspn.push({ updateOne: { filter: { id: doc.id }, update: { $set: doc }, upsert: true } });
    }
    if (ops.length) await coll.bulkWrite(ops, { ordered: false });
    if (opsEspn.length) await collESPN.bulkWrite(opsEspn, { ordered: false });
  } catch (e) { console.warn('upsertTeams failed:', e.message); }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sports-live/espn-provider' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchScoreboard(league, dates = null) {
  // dates parameter format: YYYYMMDD or YYYYMMDD-YYYYMMDD for range
  let url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;
  if (dates) {
    url += `?dates=${dates}`;
  }
  return fetchJson(url);
}
async function fetchSummary(league, eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${eventId}`;
  return fetchJson(url);
}
async function fetchPlayByPlay(league, eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/playbyplay?event=${eventId}`;
  return fetchJson(url);
}

// --- ESPN Core API v2 helpers (more structured, with $ref links) ---
async function fetchCoreJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sports-live/espn-core' } });
  if (!res.ok) throw new Error(`Core fetch failed ${res.status}`);
  return res.json();
}

function coreEventUrl(league, eventId) {
  return `http://sports.core.api.espn.com/v2/sports/soccer/leagues/${league}/events/${eventId}?lang=en&region=us`;
}

async function fetchCoreEvent(league, eventId) {
  const root = await fetchCoreJson(coreEventUrl(league, eventId));

  // Helper: resolve a competitions node which can be:
  // - Array of {$ref}
  // - Object with {$ref} to a collection or to a single competition
  const resolveCompetition = async () => {
    try {
      // Array of refs
      if (Array.isArray(root?.competitions)) {
        const firstRef = root.competitions.find(x => x && x.$ref)?.$ref;
        if (firstRef) return await fetchCoreJson(firstRef);
      }
      // Single object with $ref
      if (root?.competitions?.$ref) {
        const compOrList = await fetchCoreJson(root.competitions.$ref);
        // Some endpoints return a list wrapper with items; pick the one matching eventId or first
        if (Array.isArray(compOrList?.items) && compOrList.items.length) {
          // Try to find matching competition id
          const match = compOrList.items.find(it => String(it?.id || it?.uid || '') === String(eventId) || it?.$ref?.includes(`/competitions/${eventId}`));
          if (match?.$ref) return await fetchCoreJson(match.$ref);
          if (match) return match;
          // If items are refs, fetch the first
          const firstItem = compOrList.items[0];
          if (firstItem?.$ref) return await fetchCoreJson(firstItem.$ref);
          return compOrList;
        }
        return compOrList;
      }
    } catch (_) {}
    return null;
  };

  const comp = await resolveCompetition();

  // Pull competitor nodes (array of {$ref} OR object with {$ref} to collection having items)
  const resolveCompetitors = async () => {
    const out = [];
    try {
      if (Array.isArray(comp?.competitors)) {
        for (const c of comp.competitors) {
          if (c?.$ref) { try { out.push(await fetchCoreJson(c.$ref)); } catch (_) {} }
          else if (c) out.push(c);
        }
      } else if (comp?.competitors?.$ref) {
        const list = await fetchCoreJson(comp.competitors.$ref);
        const items = Array.isArray(list?.items) ? list.items : [];
        for (const it of items) {
          if (it?.$ref) { try { out.push(await fetchCoreJson(it.$ref)); } catch (_) {} }
          else if (it) out.push(it);
        }
      }
    } catch (_) {}
    return out;
  };

  const competitors = await resolveCompetitors();

  // Status node
  const status = comp?.status?.$ref ? await fetchCoreJson(comp.status.$ref) : null;

  // Commentaries/Details: attempt to fetch latest page if paginated and dereference items when they are $refs
  const fetchCollectionSmart = async (refNode) => {
    try {
      if (!refNode?.$ref) return null;
      let col = await fetchCoreJson(refNode.$ref);
      // If paginated and we are not on last page, try to pull last page where newest items usually are
      const pageCount = col?.pageCount;
      const pageIndex = col?.pageIndex;
      const baseRef = col?.$ref || refNode.$ref;
      if (typeof pageCount === 'number' && typeof pageIndex === 'number' && pageCount > 1 && pageIndex !== pageCount) {
        // Attempt to replace page param; fallback to appending if missing
        let lastUrl = baseRef;
        if (/([?&])page=\d+/.test(baseRef)) {
          lastUrl = baseRef.replace(/([?&])page=\d+/, `$1page=${pageCount}`);
        } else {
          lastUrl = baseRef + (baseRef.includes('?') ? `&page=${pageCount}` : `?page=${pageCount}`);
        }
        try { col = await fetchCoreJson(lastUrl); } catch (_) {}
      }
      // Dereference each item if it is a $ref
      const items = Array.isArray(col?.items) ? col.items : [];
      const resolved = [];
      for (const it of items) {
        if (it?.$ref) {
          try { resolved.push(await fetchCoreJson(it.$ref)); } catch (_) {}
        } else if (it) {
          resolved.push(it);
        }
      }
      // Return a shape compatible with callers expecting .items
      return { ...col, items: resolved };
    } catch (_) {
      return null;
    }
  };

  const details = comp?.details ? (comp?.details?.$ref ? await fetchCollectionSmart(comp.details) : comp.details) : null;
  const commentaries = comp?.commentaries ? (comp?.commentaries?.$ref ? await fetchCollectionSmart(comp.commentaries) : comp.commentaries) : null;

  // For each competitor, fetch statistics and roster
  const compExtras = [];
  for (const c of competitors) {
    let stats = null, roster = null, team = null, score = null;
    try { if (c?.statistics?.$ref) stats = await fetchCoreJson(c.statistics.$ref); } catch(_) {}
    try { if (c?.roster?.$ref) roster = await fetchCoreJson(c.roster.$ref); } catch(_) {}
    try { if (c?.team?.$ref) team = await fetchCoreJson(c.team.$ref); } catch(_) {}
    try { if (c?.score?.$ref) score = await fetchCoreJson(c.score.$ref); } catch(_) {}
    compExtras.push({ base: c, stats, roster, team, score });
  }

  return { root, comp, competitors: compExtras, status, details, commentaries };
}

// Fetch a Core collection across all pages and dereference each item $ref.
// Accepts either a $ref node { $ref } or a string URL.
async function fetchCoreCollectionAll(refOrUrl) {
  try {
    const url = typeof refOrUrl === 'string' ? refOrUrl : (refOrUrl?.$ref || '');
    if (!url) return { items: [] };
    const first = await fetchCoreJson(url);
    const pageCount = first?.pageCount || 1;
    const baseRef = first?.$ref || url;
    const collect = [];
    const buildUrl = (page) => {
      if (/([?&])page=\d+/.test(baseRef)) return baseRef.replace(/([?&])page=\d+/, `$1page=${page}`);
      return baseRef + (baseRef.includes('?') ? `&page=${page}` : `?page=${page}`);
    };
    for (let p = 1; p <= pageCount; p++) {
      let col = first;
      if (p !== (first?.pageIndex || 1)) {
        try { col = await fetchCoreJson(buildUrl(p)); } catch (_) { continue; }
      }
      const items = Array.isArray(col?.items) ? col.items : [];
      for (const it of items) {
        if (it?.$ref) {
          try { collect.push(await fetchCoreJson(it.$ref)); } catch (_) {}
        } else if (it) {
          collect.push(it);
        }
      }
    }
    return { items: collect, pageCount };
  } catch (_) {
    return { items: [] };
  }
}

function normalizeCoreCommentary(details, commentaries, teamSideMap) {
  const out = [];
  const minuteFromClock = minuteFromClockCore;
  const canon = canonicalEventType;
  // Plays often richer than commentaries for types
  const list = [];
  if (Array.isArray(details?.items)) list.push(...details.items);
  if (Array.isArray(commentaries?.items)) list.push(...commentaries.items);
  for (const it of list) {
    const teamName = it?.team?.displayName || it?.team?.name || it?.attribution || undefined;
    const playerName = it?.athlete?.displayName || it?.athlete?.name || it?.playerName || undefined;
    const side = teamName && teamSideMap[String(teamName).toLowerCase()] ? teamSideMap[String(teamName).toLowerCase()] : undefined;
    const time = it?.clock?.displayValue || it?.time || it?.clock || undefined;
    out.push({
      id: it?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: canon(it?.type?.id || it?.type?.text || it?.type || it?.playType),
      time,
      minute: minuteFromClock(time),
      team: teamName,
      teamSide: side,
      player: playerName,
      description: it?.text || it?.comment || it?.description
    });
  }
  return out;
}

function minuteFromClockCore(displayClock) {
  if (!displayClock) return undefined;
  const s = String(displayClock);
  const stoppage = /(\d{1,3})'\+(\d{1,2})/.exec(s);
  if (stoppage) return Math.min(120, parseInt(stoppage[1],10)+parseInt(stoppage[2],10));
  const base = /(\d{1,3})'?$/.exec(s);
  if (base) return Math.min(120, parseInt(base[1],10));
  const mmss = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (mmss) return Math.min(120, parseInt(mmss[1],10));
  return undefined;
}

function mapCoreStats(competitorsExtras) {
  // competitorsExtras: [{ base, stats, roster, team, score }]
  const out = { };
  const accum = {};
  const sideOf = (c) => (c?.base?.homeAway === 'home' ? 'home' : 'away');
  for (const c of competitorsExtras) {
    const side = sideOf(c);
    const stats = c?.stats?.items || c?.stats?.statistics || c?.stats?.splits || c?.stats || [];
    const nodes = Array.isArray(stats) ? stats : (Array.isArray(stats?.items) ? stats.items : []);
    const scanNode = (node) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(scanNode); return; }
      if (node?.statistics && Array.isArray(node.statistics)) { scanNode(node.statistics); }
      const name = node?.name || node?.displayName || node?.abbreviation || node?.type;
      const value = node?.displayValue ?? node?.value ?? node?.text;
      if (!name || value == null) return;
      const key = String(name).toLowerCase().trim();
      const norm = (key === 'possession %' || key === 'possession%' || key === 'poss') ? 'possession' : key;
      let num = null;
      if (typeof value === 'number') num = value;
      else if (typeof value === 'string') {
        const pct = /(\d{1,3})%/.exec(value);
        if (pct) num = parseInt(pct[1], 10);
        else {
          const n = parseInt(value.replace(/[^0-9-]/g, ''), 10);
          if (!isNaN(n)) num = n;
        }
      }
      if (num == null) return;
      accum[norm] = accum[norm] || { home: 0, away: 0 };
      accum[norm][side] = num;
    };
    scanNode(nodes);
  }
  // Project known keys
  out.possession = accum['possession'];
  out.shotsOnTarget = accum['shots on target'] || accum['shots on goal'];
  out.shotsOffTarget = accum['shots off target'];
  out.totalShots = accum['shots'] || accum['total shots'];
  out.corners = accum['corners'] || accum['corner kicks'];
  out.fouls = accum['fouls'];
  out.yellowCards = accum['yellow cards'];
  out.redCards = accum['red cards'];
  out.offsides = accum['offsides'];
  out.saves = accum['saves'];
  out.passAccuracy = accum['pass accuracy'] || accum['passing accuracy'];
  out.lastUpdated = new Date();
  return out;
}

async function mapCoreRoster(competitorsExtras, matchId) {
  // Follow roster items $refs to fetch full athlete details
  const lineups = [];
  for (const c of competitorsExtras) {
    const teamIdRaw = c?.base?.id; 
    const teamId = /^\d+$/.test(String(teamIdRaw||'')) ? parseInt(String(teamIdRaw),10) : teamIdRaw;
    const teamName = c?.team?.displayName || c?.team?.name;
    const formationSummary = c?.roster?.formation?.summary || c?.roster?.formation?.name || undefined;
    const players = [];
    const roster = c?.roster || {};
    const items = roster?.items || roster?.entries || [];
    for (const it of items) {
      try {
        // it may be a {$ref} link or an inline entry
        const entry = it?.$ref ? await fetchCoreJson(it.$ref) : it;
        // Some entries reference athlete via $ref
        let ath = entry?.athlete;
        if (ath && ath.$ref) ath = await fetchCoreJson(ath.$ref);
        // Starter flag and position
        const starter = !!(entry?.starter || entry?.starting || entry?.startingPosition || entry?.status === 'starter' || entry?.period === 0);
        const idRaw = ath?.id || entry?.id;
        const id = /^\d+$/.test(String(idRaw||'')) ? parseInt(String(idRaw),10) : idRaw;
        const name = ath?.displayName || ath?.shortName || ath?.name || entry?.name;
        // Prefer athlete.position.abbreviation; fallback to roster entry.position (may be $ref -> id)
        let position = ath?.position?.abbreviation || entry?.position?.abbreviation || entry?.position;
        const jersey = entry?.jersey || entry?.uniform || undefined;
        const formationPlace = entry?.formationPlace || undefined;
        // Nationality/country when available
        const nationality = ath?.citizenshipCountry?.abbreviation || ath?.citizenship || ath?.flag?.alt || undefined;
        if (name) {
          players.push({ id, name, position, jersey, starter, formationPlace, nationality });
        }
      } catch(_) {}
    }
    lineups.push({ matchId: /^\d+$/.test(String(matchId)) ? parseInt(String(matchId),10) : matchId, teamId, teamName, formation: formationSummary, players, lastUpdated: new Date() });
  }
  return lineups;
}

function normalizeMatchFromScoreboard(ev, league) {
  const comp = Array.isArray(ev.competitions) ? ev.competitions[0] : ev;
  const competitors = comp?.competitors || [];
  const homeRaw = competitors.find(c => c.homeAway === 'home') || competitors[0];
  const awayRaw = competitors.find(c => c.homeAway === 'away') || competitors[1];
  const homeTeam = mapCompetitor(homeRaw);
  const awayTeam = mapCompetitor(awayRaw);
  const { homeScore, awayScore } = deriveScoreFromCompetitors(competitors);
  const status = mapStatus(comp?.status?.type?.state || ev?.status?.type?.state);
  const minute = minuteFromClock(comp?.status?.displayClock || comp?.status?.type?.shortDetail || comp?.status?.type?.detail);
  const utcDate = parseIsoDate(ev?.date || comp?.date || ev?.startDate);
  const competitionName = (comp?.league || ev?.league)?.name || league;

  return {
    id: ev.id?.toString() || String(ev.uid || ev.guid || Date.now()),
    homeTeam,
    awayTeam,
    competition: { id: competitionName, name: competitionName, code: league },
    utcDate,
    status,
    minute,
    matchday: comp?.round?.number || null,
    stage: comp?.type?.name || 'REGULAR_SEASON',
    group: comp?.group || null,
    score: { fullTime: { home: homeScore, away: awayScore } },
    source: 'espn',
    lastUpdated: new Date()
  };
}

function mapStatsFromSummary(summary, matchId) {
  const out = { matchId, lastUpdated: new Date() };
  try {
    const headerComp = Array.isArray(summary?.header?.competitions) ? summary.header.competitions[0] : {};
    const headerComps = headerComp?.competitors || [];
    const headerHomeId = headerComps.find(c => c.homeAway === 'home')?.team?.id;

    const teams = summary?.boxscore?.teams || [];
    const byKey = {};

    const pushStat = (side, name, value) => {
      if (!name) return;
      const key = String(name).toLowerCase().trim();
      // Normalize key aliases
      const norm = (
        key === 'possession %' || key === 'possession%' || key === 'poss' ? 'possession' :
        key
      );
      let num = null;
      if (typeof value === 'number') num = value;
      else if (typeof value === 'string') {
        const pct = /(\d{1,3})%/.exec(value);
        if (pct) num = parseInt(pct[1], 10);
        else {
          const n = parseInt(value.replace(/[^0-9-]/g, ''), 10);
          if (!isNaN(n)) num = n;
        }
      }
      if (num == null) return;
      byKey[norm] = byKey[norm] || { home: 0, away: 0 };
      byKey[norm][side] = num;
    };

    const extractTeamStats = (teamNode, side) => {
      if (!teamNode) return;
      // Shapes seen: statistics: [ { name, value/displayValue }, ... ]
      const stats = teamNode.statistics;
      const scan = (node) => {
        if (!node) return;
        if (Array.isArray(node)) { node.forEach(scan); return; }
        if (node.statistics && Array.isArray(node.statistics)) { scan(node.statistics); }
        // Individual stat object
        const name = node.name || node.displayName || node.abbreviation;
        const value = node.displayValue ?? node.value ?? node.text;
        if (name != null && value != null) pushStat(side, name, value);
      };
      scan(stats);
    };

    for (const t of teams) {
      // Determine side via linking teamId to header competitors
      const teamId = t?.team?.id;
      const side = (teamId && headerHomeId && String(teamId) === String(headerHomeId)) ? 'home' : 'away';
      extractTeamStats(t, side);
    }

    // Map final recognized keys
    out.possession = byKey['possession'];
    out.shotsOnTarget = byKey['shots on target'] || byKey['shots on goal'];
    out.shotsOffTarget = byKey['shots off target'];
    out.totalShots = byKey['shots'] || byKey['total shots'];
    out.corners = byKey['corners'] || byKey['corner kicks'];
    out.fouls = byKey['fouls'];
    out.yellowCards = byKey['yellow cards'];
    out.redCards = byKey['red cards'];
    out.offsides = byKey['offsides'];
    out.saves = byKey['saves'];
    out.passAccuracy = byKey['pass accuracy'] || byKey['passing accuracy'];
  } catch (e) {
    // leave defaults
  }
  return out;
}

function mapLineupsFromSummary(summary, matchId) {
  const result = [];
  try {
    // Preferred: boxscore.teams[].players (soccer)
    const comps = summary?.boxscore?.teams || [];
    for (const t of comps) {
      const teamIdRaw = t?.team?.id;
      const teamId = /^\d+$/.test(String(teamIdRaw || '')) ? parseInt(String(teamIdRaw), 10) : teamIdRaw;
      const teamName = t?.team?.displayName || t?.team?.name || undefined;
      const players = [];
      if (Array.isArray(t?.players)) {
        for (const s of t.players) {
          const athlete = s?.athlete || {};
          players.push({
            id: /^\d+$/.test(String(athlete.id||'')) ? parseInt(String(athlete.id),10) : athlete.id,
            name: athlete.displayName || athlete.shortName || athlete.name,
            position: athlete.position?.abbreviation || s?.position || undefined,
            starter: !!s?.starter
          });
        }
      }
      // Fallbacks: summary.lineups.home/away (if present)
      if (!players.length && summary?.lineups) {
        const side = (t?.homeAway || '').toLowerCase();
        const ln = side === 'home' ? summary.lineups.home : summary.lineups.away;
        if (ln) {
          const pushList = (arr, starterFlag) => {
            for (const p of arr || []) {
              players.push({
                id: /^\d+$/.test(String(p?.athlete?.id||'')) ? parseInt(String(p.athlete.id),10) : p?.athlete?.id,
                name: p?.athlete?.displayName || p?.athlete?.shortName,
                position: p?.athlete?.position?.abbreviation || p?.position,
                starter: starterFlag
              });
            }
          };
          pushList(ln.starters, true);
          pushList(ln.substitutes, false);
        }
      }
      result.push({ matchId: (/^\d+$/.test(String(matchId)) ? parseInt(String(matchId),10) : matchId), teamId, teamName, players, lastUpdated: new Date() });
    }
  } catch (e) {
    // ignore
  }
  return result;
}

async function upsertEventsAndLog(matchDoc, commentary) {
  const db = await getDatabase();
  const matchesColl = await getMatchesCollection();
  const matchesCollESPN = await getMatchesCollectionESPN();
  // Ensure helpful indexes (best-effort)
  try { await matchesCollESPN.createIndex({ id: 1 }, { unique: true }); } catch(_){ }
  try { await matchesCollESPN.createIndex({ utcDate: 1 }); } catch(_){ }
  const eventLog = db.collection('Event_Log');
  const matchId = matchDoc.id;
  const teamSideMap = {};
  if (matchDoc.homeTeam?.name) teamSideMap[String(matchDoc.homeTeam.name).toLowerCase()] = 'home';
  if (matchDoc.awayTeam?.name) teamSideMap[String(matchDoc.awayTeam.name).toLowerCase()] = 'away';

  const normalized = (Array.isArray(commentary) ? commentary : []).map(c => normalizeEvent(c, teamSideMap));
  await matchesColl.updateOne({ id: matchId }, { $set: { events: normalized, lastUpdated: new Date() } });

  // Insert scoring events to Event_Log with rolling scoreAfter
  const scoring = normalized.filter(e => ['goal','penalty','own_goal'].includes(e.type));
  let rolling = { home: 0, away: 0 };
  for (const e of scoring) {
    if (e.type === 'own_goal') {
      if (e.teamSide === 'home') rolling.away += 1; else if (e.teamSide === 'away') rolling.home += 1;
    } else {
      if (e.teamSide === 'home') rolling.home += 1; else if (e.teamSide === 'away') rolling.away += 1;
    }
    try {
      await eventLog.insertOne({ timestamp: new Date(), type: e.type, message: e.description, data: { ...e, matchId }, scoreAfter: { ...rolling }, source: 'espn' });
    } catch (_) {}
  }
}

async function ingestLeague(league, requestDelay = 600) {
  // Fetch matches for the next 30 days using date range
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  
  // Format dates as YYYYMMDD for ESPN API
  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  const dateRange = `${formatDate(today)}-${formatDate(endDate)}`;
  const scoreboard = await fetchScoreboard(league, dateRange);
  const events = Array.isArray(scoreboard?.events) ? scoreboard.events : [];
  const matchesColl = await getMatchesCollection();
  // FIX: also write to ESPN cache collection
  const matchesCollESPN = await getMatchesCollectionESPN();

  let upserted = 0, updatedStats = 0, updatedLineups = 0, updatedEvents = 0;

  for (const ev of events) {
    const matchDoc = normalizeMatchFromScoreboard(ev, league);
    try {
      await upsertTeams((ev?.competitions?.[0] || ev)?.competitors);
    } catch(_) {}

    await matchesColl.updateOne(
      { id: matchDoc.id },
      { $set: matchDoc },
      { upsert: true }
    );
    await matchesCollESPN.updateOne(
      { id: matchDoc.id },
      { $set: matchDoc },
      { upsert: true }
    );
    upserted++;

    // Fetch details in parallel (best-effort)
    try {
      const [summary, pbp] = await Promise.all([
        fetchSummary(league, matchDoc.id).catch(_ => null),
        fetchPlayByPlay(league, matchDoc.id).catch(_ => null)
      ]);

  // Stats + Lineups + Commentary, merge site + Core when possible (more complete)
  let stats = summary?.boxscore ? mapStatsFromSummary(summary, matchDoc.id) : null;
  let lineups = summary ? mapLineupsFromSummary(summary, matchDoc.id) : [];
  let commentary = (pbp?.commentary || pbp?.plays || []);

      let needCore = false;
      if (!stats || (stats.possession && stats.possession.home === 0 && stats.possession.away === 0)) needCore = true;
      if (!Array.isArray(lineups) || lineups.every(l => !l.players?.length)) needCore = true;
      if (!Array.isArray(commentary) || commentary.length === 0) needCore = true;

      if (needCore) {
        try {
          const core = await fetchCoreEvent(league, matchDoc.id);
          // Build teamSide map from header/comp
          const teamSideMap = {};
          const compComps = Array.isArray(core?.comp?.competitors) ? core.comp.competitors : [];
          for (const c of compComps) {
            const node = c?.team?.displayName ? c : (c?.team?.$ref ? await fetchCoreJson(c.team.$ref) : null);
            const name = node?.team?.displayName || node?.displayName || node?.name;
            const side = c?.homeAway;
            if (name && (side === 'home' || side === 'away')) teamSideMap[String(name).toLowerCase()] = side;
          }
          // Commentary: merge site and core to maximize coverage - fetch ALL pages
          const allPlays = core?.comp?.details ? await fetchCoreCollectionAll(core.comp.details.$ref || core.comp.details) : null;
          const allComm = core?.comp?.commentaries ? await fetchCoreCollectionAll(core.comp.commentaries.$ref || core.comp.commentaries) : null;
          const det = allPlays && Array.isArray(allPlays.items) ? { items: allPlays.items } : core?.details;
          const com = allComm && Array.isArray(allComm.items) ? { items: allComm.items } : core?.commentaries;
          const coreEvents = normalizeCoreCommentary(det, com, teamSideMap);
          if (Array.isArray(coreEvents) && coreEvents.length) {
            const combined = [ ...(Array.isArray(commentary) ? commentary : []), ...coreEvents ];
            const seen = new Set();
            const merged = [];
            for (const c of combined) {
              const key = c?.id || `${c?.text || c?.description || ''}|${c?.clock?.displayValue || c?.time || ''}`;
              if (seen.has(key)) continue; seen.add(key); merged.push(c);
            }
            commentary = merged;
          }
          // Stats fallback
          const coreStats = mapCoreStats(core?.competitors || []);
          if (!stats || (stats.possession && stats.possession.home === 0 && stats.possession.away === 0)) stats = { matchId: (/^\d+$/.test(String(matchDoc.id))?parseInt(String(matchDoc.id),10):matchDoc.id), ...coreStats };
          // Lineups fallback
          const coreLineups = await mapCoreRoster(core?.competitors || [], matchDoc.id);
          if ((!Array.isArray(lineups) || lineups.every(l => !l.players?.length)) && coreLineups.length) lineups = coreLineups;
        } catch (_) {}
      }

      // Persist stats
      if (stats) {
        try {
          const db = await getDatabase();
          await db.collection('Match_Statistics').updateOne(
            { matchId: stats.matchId || String(matchDoc.id) },
            { $set: stats },
            { upsert: true }
          );
          await db.collection('Match_Statistics_ESPN').updateOne(
            { matchId: stats.matchId || String(matchDoc.id) },
            { $set: stats },
            { upsert: true }
          );
          updatedStats++;
        } catch (_) {}
      }

      // Persist lineups
      if (Array.isArray(lineups) && lineups.length) {
        try {
          const lineupsColl = await getMatchLineupsCollection();
          const lineupsCollESPN = await getMatchLineupsCollectionESPN();
          for (const lu of lineups) {
            await lineupsColl.updateOne(
              { matchId: lu.matchId, teamId: lu.teamId },
              { $set: lu },
              { upsert: true }
            );
            await lineupsCollESPN.updateOne(
              { matchId: lu.matchId, teamId: lu.teamId },
              { $set: lu },
              { upsert: true }
            );
          }
          updatedLineups += lineups.length;
        } catch (_) {}
      }

      // Persist commentary/events
      if (Array.isArray(commentary) && commentary.length) {
        await upsertEventsAndLog(matchDoc, commentary);
        updatedEvents += commentary.length;
        try {
          const commColl = await getMatchCommentaryCollection();
          const commCollESPN = await getMatchCommentaryCollectionESPN();
          await commColl.updateOne(
            { matchId: String(matchDoc.id) },
            { $set: { matchId: String(matchDoc.id), commentary, lastUpdated: new Date() } },
            { upsert: true }
          );
          await commCollESPN.updateOne(
            { matchId: String(matchDoc.id) },
            { $set: { matchId: String(matchDoc.id), commentary, lastUpdated: new Date() } },
            { upsert: true }
          );
        } catch(_) {}
      }
    } catch (e) {
      // Non-fatal per match
    }

    await sleep(requestDelay);
  }

  return { league, events: events.length, upserted, updatedStats, updatedLineups, updatedEvents };
}

async function run({ leagues, requestDelay } = {}) {
  const list = Array.isArray(leagues) && leagues.length ? leagues : (process.env.ESPN_LEAGUES ? process.env.ESPN_LEAGUES.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_LEAGUES);
  const delay = typeof requestDelay === 'number' ? requestDelay : 700;
  const results = [];
  for (const lg of list) {
    try {
      const r = await ingestLeague(lg, delay);
      results.push(r);
    } catch (e) {
      results.push({ league: lg, error: e.message });
    }
  }
  return results;
}

module.exports = {
  run,
  ingestLeague,
  fetchScoreboard,
  fetchSummary,
  fetchPlayByPlay,
  // Core API helpers (used by API read fallbacks)
  fetchCoreEvent,
  fetchCoreCollectionAll,
  normalizeCoreCommentary,
  // Convenience: get lineups via Core API for a given match
  getCoreLineups: async (league, eventId) => {
    const core = await fetchCoreEvent(league, eventId);
    return await mapCoreRoster(core?.competitors || [], eventId);
  }
};
