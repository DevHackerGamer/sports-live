// Sports data API endpoint using football-data.org and MongoDB storage
const fetch = require('node-fetch');
const { getMatchesCollection, getTeamsCollection } = require('../lib/mongodb');

// for caching beacause of some error 429 for req limit on free tier causes some internal server error 500 :(
let teamsCache = null;
let teamsCacheTime = 0;
const TEAMS_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache for teams

// Function to store matches and teams in MongoDB
async function storeMatchesAndTeams(games) {
  try {
    // Store matches
    if (games && games.length > 0) {
      const matchesCollection = await getMatchesCollection();
      const operations = games.map(match => ({
        updateOne: {
          filter: { id: match.id },
          update: { 
            $set: {
              ...match,
              lastUpdated: new Date().toISOString()
            }
          },
          upsert: true
        }
      }));
      
      await matchesCollection.bulkWrite(operations);
      console.log(`Stored ${games.length} matches in MongoDB`);
    }

    // Extract and store teams
    const teamsSet = new Set();
    games.forEach(game => {
      if (game.homeTeam) teamsSet.add(game.homeTeam);
      if (game.awayTeam) teamsSet.add(game.awayTeam);
    });

    if (teamsSet.size > 0) {
      const teamsCollection = await getTeamsCollection();
      const teamOperations = Array.from(teamsSet).map(teamName => ({
        updateOne: {
          filter: { name: teamName },
          update: { 
            $set: {
              name: teamName,
              lastUpdated: new Date().toISOString()
            }
          },
          upsert: true
        }
      }));
      
      await teamsCollection.bulkWrite(teamOperations);
      console.log(`Stored ${teamsSet.size} teams in MongoDB`);
    }
  } catch (error) {
    console.error('Error in storeMatchesAndTeams:', error);
    throw error;
  }
}

async function handler(req, res) {
  // Security headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // getting all teams available to validate team name and get upcoming matchs from all competitions(league)
  if (req.query?.endpoint === 'teams') {
    try {
      const now = Date.now();

      // Serve cached teams if valid -> cached beacause of some error 429 for req limit on free tier causes some internal server error 500 :(
      if (teamsCache && (now - teamsCacheTime) < TEAMS_CACHE_DURATION_MS) {
        return res.status(200).json({ teams: teamsCache, total: teamsCache.length });
      }

      const token = process.env.FOOTBALL_API_TOKEN;
      if (!token) throw new Error('API token not configured');

      // Fetch all available competitions(leagues)
      const compRes = await fetch('https://api.football-data.org/v4/competitions', {
        headers: { 'X-Auth-Token': token, 'User-Agent': 'Sports Live App v1.0' }
      });
      if (!compRes.ok) throw new Error(`Failed to fetch competitions: ${compRes.status}`);
      const compData = await compRes.json();
      const competitions = Array.isArray(compData?.competitions) ? compData.competitions.map(c => c.code) : [];

      // Fetch teams from each competition(league)
      const allTeams = [];
      await Promise.all(
        competitions.map(async (code) => {
          try {
            const url = `https://api.football-data.org/v4/competitions/${code}/teams`;
            const resComp = await fetch(url, { headers: { 'X-Auth-Token': token, 'User-Agent': 'Sports Live App v1.0' } });
            if (!resComp.ok) return;
            const data = await resComp.json();
            if (Array.isArray(data?.teams)) {
              allTeams.push(...data.teams.map(t => ({
                id: t.id,
                name: t.name,
                shortName: t.shortName,
                tla: t.tla,
                area: t.area?.name,
                competition: code
              })));
            }
          } catch {}
        })
      );

      // Remove duplicates by team ID
      const uniqueTeams = Object.values(allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
      }, {}));

      // Save to cache
      teamsCache = uniqueTeams;
      teamsCacheTime = now;

      return res.status(200).json({ teams: uniqueTeams, total: uniqueTeams.length });
    } catch (err) {
      console.error('Error fetching teams:', err.message);
      return res.status(500).json({ error: 'Failed to fetch teams', message: err.message, teams: [] });
    }
  }

  try {
    const token = process.env.FOOTBALL_API_TOKEN;
    if (!token) {
      console.error('FOOTBALL_API_TOKEN is not set');
      throw new Error('API token not configured');
    }

    // Query params
    const competitionFilter = req.query?.competition ? String(req.query.competition) : undefined; // e.g., PL, CL
    const limit = Number.isFinite(Number(req.query?.limit)) ? Math.max(1, Math.min(200, Number(req.query.limit))) : 50;
    const rangeDays = Number.isFinite(Number(req.query?.range)) ? Math.max(0, Math.min(10, Number(req.query.range))) : 7;
    const fromQ = req.query?.from ? String(req.query.from) : undefined; // YYYY-MM-DD
    const toQ = req.query?.to ? String(req.query.to) : undefined;       // YYYY-MM-DD

    const now = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const dateFrom = fromQ || fmt(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
    const dateTo = toQ || fmt(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + rangeDays)));

    const url = `https://api.football-data.org/v4/matches?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
    console.log(`football-data.org: fetching matches dateFrom=${dateFrom} dateTo=${dateTo}${competitionFilter ? ` filter=${competitionFilter}` : ''}`);
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': token,
        'User-Agent': 'Sports Live App v1.0'
      }
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`football-data.org status ${response.status} body: ${text.slice(0,200)}`);
    }

    const data = await response.json();
    const allMatches = Array.isArray(data?.matches) ? data.matches : [];

    // Optional: filter by competition code
    const filtered = competitionFilter
      ? allMatches.filter(m => (m.competition?.code || '').toUpperCase() === competitionFilter.toUpperCase())
      : allMatches;

    // Helper to normalize objects to strings for React rendering
    const normalizeText = (val, fallback = 'Unknown') => {
      if (val == null) return fallback;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        if (typeof val.en === 'string') return val.en;
        if (typeof val.name === 'string') return val.name;
        const first = Object.values(val).find(v => typeof v === 'string');
        if (first) return first;
      }
      return fallback;
    };

    const games = filtered
      .slice(0, limit)
      .map(m => ({
        id: m.id,
        homeTeam: normalizeText(m.homeTeam?.name || m.homeTeam?.shortName),
        awayTeam: normalizeText(m.awayTeam?.name || m.awayTeam?.shortName),
        homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0,
        awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0,
        status: m.status === 'IN_PLAY' ? 'live' :
               m.status === 'FINISHED' ? 'final' :
               (m.status === 'SCHEDULED' || m.status === 'TIMED') ? 'scheduled' : 'upcoming',
        sport: 'Football',
        competition: normalizeText(m.competition?.name || m.competition?.code, 'Football'),
        competitionCode: m.competition?.code,
        venue: normalizeText(m.venue, 'TBD'),
        minute: null,
        utcDate: m.utcDate,
        matchday: m.matchday,
        lastChanged: m.lastUpdated,
        area: normalizeText(m.competition?.area?.name)
      }));

    const payload = {
      games,
      lastUpdated: new Date().toISOString(),
      source: 'football-data.org',
      totalMatches: games.length,
      apiStatus: 'operational',
      environment: process.env.NODE_ENV || 'development',
      dateFrom,
      dateTo
    };

    console.log(`football-data.org: served ${games.length} matches across competitions` + (competitionFilter ? ` (filter=${competitionFilter})` : ''));
    
    // Store matches and teams in MongoDB
    try {
      await storeMatchesAndTeams(games);
    } catch (storageError) {
      console.error('Error storing data in MongoDB:', storageError.message);
      // Don't fail the request if storage fails
    }
    
    return res.status(200).json(payload);
  } catch (error) {
    console.error('football-data.org API Error:', error.message);
    return res.status(500).json({
      error: 'Unable to fetch sports data',
      message: error.message || 'Service temporarily unavailable',
      games: [],
      lastUpdated: new Date().toISOString(),
      source: 'error-response',
      totalMatches: 0,
      apiStatus: 'error',
      environment: process.env.NODE_ENV || 'development'
    });
  }
}

module.exports = handler;