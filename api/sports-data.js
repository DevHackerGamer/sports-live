// Sports data API endpoint using football-data.org only
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

    const games = filtered
      .slice(0, limit)
      .map(m => ({
        id: m.id,
        homeTeam: m.homeTeam?.name || m.homeTeam?.shortName,
        awayTeam: m.awayTeam?.name || m.awayTeam?.shortName,
        homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0,
        awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0,
        status: m.status === 'IN_PLAY' ? 'live' :
               m.status === 'FINISHED' ? 'final' :
               (m.status === 'SCHEDULED' || m.status === 'TIMED') ? 'scheduled' : 'upcoming',
        sport: 'Football',
        competition: m.competition?.name || m.competition?.code || 'Football',
        competitionCode: m.competition?.code,
        venue: m.venue || 'TBD',
        minute: null,
        utcDate: m.utcDate,
        matchday: m.matchday,
        lastChanged: m.lastUpdated,
        area: m.competition?.area?.name
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
