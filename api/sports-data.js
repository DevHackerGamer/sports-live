// Professional sports data API endpoint for production
export default async function handler(req, res) {
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
    console.log('Production API: Fetching real football data...');
    
    const footballResponse = await fetch('https://api.football-data.org/v4/matches', {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_API_TOKEN || '6790d9c4818341a5b88d4493ca8b3a8c',
        'User-Agent': 'Sports Live App v1.0'
      }
    });

    if (!footballResponse.ok) {
      throw new Error(`Football API responded with status: ${footballResponse.status}`);
    }

    const footballData = await footballResponse.json();
    
    // Transform and filter the API data for production
    const transformedGames = footballData.matches
      ?.filter(match => {
        // Only show matches from today and the next 3 days
        const matchDate = new Date(match.utcDate);
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);
        
        return matchDate >= today && matchDate <= threeDaysFromNow;
      })
      ?.slice(0, 8) // Show up to 8 matches
      ?.map(match => ({
        id: match.id,
        homeTeam: match.homeTeam.name || match.homeTeam.shortName,
        awayTeam: match.awayTeam.name || match.awayTeam.shortName,
        homeScore: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? 0,
        awayScore: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? 0,
        status: match.status === 'IN_PLAY' ? 'live' : 
               match.status === 'FINISHED' ? 'final' : 
               match.status === 'SCHEDULED' ? 'scheduled' : 
               match.status === 'TIMED' ? 'scheduled' : 'upcoming',
        sport: 'Football',
        competition: match.competition?.name || 'Football',
        venue: match.venue || 'TBD',
        minute: match.minute || null,
        utcDate: match.utcDate,
        matchday: match.matchday,
        // Additional production data
        lastChanged: match.lastUpdated,
        area: match.competition?.area?.name
      })) || [];

    const responseData = {
      games: transformedGames,
      lastUpdated: new Date().toISOString(),
      source: 'football-data.org',
      totalMatches: transformedGames.length,
      apiStatus: 'operational',
      environment: 'production'
    };

    console.log(`Production API: Successfully served ${transformedGames.length} matches`);
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Production API Error:', error.message);
    
    // Production error response
    res.status(500).json({
      error: 'Unable to fetch sports data',
      message: 'Service temporarily unavailable',
      games: [],
      lastUpdated: new Date().toISOString(),
      source: 'error-response',
      totalMatches: 0,
      apiStatus: 'error',
      environment: 'production'
    });
  }
}
