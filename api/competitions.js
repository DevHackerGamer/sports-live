const { getMatchesCollectionESPN } = require('../lib/mongodb');

// Map ESPN league codes to display names
const LEAGUE_DISPLAY_NAMES = {
  'eng.1': 'Premier League',
  'esp.1': 'La Liga',
  'ita.1': 'Serie A',
  'ger.1': 'Bundesliga',
  'fra.1': 'Ligue 1',
  'uefa.champions': 'Champions League'
};

// Valid ESPN league codes that we support
const VALID_ESPN_LEAGUES = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Method not allowed'});
  try {
    // Get competitions ONLY from ESPN collection (primary source)
    // This ensures only API-backed competitions are available
    const matchesCollectionESPN = await getMatchesCollectionESPN();
    
    const names = await matchesCollectionESPN.distinct('competition.name', { 'competition.name': { $exists: true } });
    
    // Filter to only include valid ESPN leagues and map to display names
    const competitions = VALID_ESPN_LEAGUES
      .filter(code => names.includes(code))
      .map(code => ({
        code: code,
        name: LEAGUE_DISPLAY_NAMES[code] || code,
        display: `${LEAGUE_DISPLAY_NAMES[code] || code} [${code}]`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // For backward compatibility, also return just the display strings
    const displayStrings = competitions.map(c => c.display);
    
    res.status(200).json({ 
      success: true, 
      data: displayStrings,  // For backward compatibility with MatchSetup
      competitions: competitions,  // Detailed info for components that need it
      count: displayStrings.length,
      source: 'espn'
    });
  } catch (e) {
    res.status(500).json({ success:false, error:'Failed to load competitions', message: e.message });
  }
};
