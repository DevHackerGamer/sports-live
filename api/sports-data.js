const fetch = require('node-fetch');
const { db, ref, update, set } = require('../src/lib/firebase');

// Only free leagues (Football-Data.org free plan)
const FREE_LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED', 'PPL'];

let lastFetchTime = 0;
let liveMatches = new Set();
let fetchInProgress = null;
let cachedMatches = [];

async function fetchLeagueMatches(league, token, dateFrom, dateTo) {
  const url = `https://api.football-data.org/v4/competitions/${league}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const res = await fetch(url, { headers: { 'X-Auth-Token': token, 'User-Agent': 'Sports Live App v1.0' } });
  if (!res.ok) {
    console.warn(`Skipping ${league}: ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.matches) ? data.matches : [];
}

async function fetchAndStoreMatches() {
  const now = Date.now();

  // If a fetch is ongoing wait for it so that the dash and fav is not left black
  if (fetchInProgress) return fetchInProgress;

  // If last fetch was recent, return cached matches 30sec to tighten it up while app flows
  if (now - lastFetchTime < 30000) {
    console.log("Returning cached matches to avoid hitting API cap.");
    return cachedMatches;
  }

  fetchInProgress = (async () => {
    lastFetchTime = now;
    const token = process.env.FOOTBALL_API_TOKEN;
    if (!token) throw new Error('API token not configured');

    const pad2 = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const dateFrom = fmt(new Date());
    const dateTo = fmt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const allMatches = [];
    const allTeamsSet = new Set();
    const newLiveMatches = new Set();

    for (const league of FREE_LEAGUES) {
      const matches = await fetchLeagueMatches(league, token, dateFrom, dateTo);

      matches.forEach(m => {
        const home = m.homeTeam?.name || 'TBA';
        const away = m.awayTeam?.name || 'TBA';
        allTeamsSet.add(home);
        allTeamsSet.add(away);

        const status = m.status === 'IN_PLAY' ? 'live'
                     : m.status === 'FINISHED' ? 'final'
                     : (m.status === 'SCHEDULED' || m.status === 'TIMED') ? 'scheduled'
                     : 'upcoming';

        if (status === 'live') newLiveMatches.add(m.id);

        allMatches.push({
          id: m.id ?? `TBA-${Date.now()}-${Math.random()}`,
          homeTeam: home,
          awayTeam: away,
          homeScore: m.score?.fullTime?.home ?? 'TBA',
          awayScore: m.score?.fullTime?.away ?? 'TBA',
          status,
          sport: 'Football',
          competition: m.competition?.name || league,
          utcDate: m.utcDate || 'TBA',
          minute: m.minute ?? 'TBA',
          lastChanged: m.lastUpdated || 'TBA',
        });
      });
    }

    // Update matches in Firebase to be in sync with matches and scales our rdb accordingly
    const updates = {};
    allMatches.forEach(m => { updates[m.id] = m; });
    await update(ref(db, 'matches'), updates);

    // Update teams once since teams hardly change so add to rdb and do the rest
    await set(ref(db, 'teams'), Array.from(allTeamsSet).sort());

    // Track live matches
    liveMatches = newLiveMatches;

    console.log(`[${new Date().toISOString()}] Matches updated: ${allMatches.length}`);

    // Store cached matches - to save number of requests and avaid server error when hiting api too much 
    cachedMatches = allMatches;
    fetchInProgress = null;

    return allMatches;
  })();

  return fetchInProgress;
}

// Auto-refresh every 1 minute to not exceed the cap in free tier
setInterval(fetchAndStoreMatches, 60000);

// API handler store matches and store them in firebase rdb
async function handler(req, res) {
  try {
    const games = await fetchAndStoreMatches();
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.status(200).json({
      totalMatches: games.length,
      lastUpdated: new Date().toISOString(),
      source: 'football-data.org',
      games,
    });
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches', message: err.message, games: [] });
  }
}

module.exports = { fetchAndStoreMatches, handler };
