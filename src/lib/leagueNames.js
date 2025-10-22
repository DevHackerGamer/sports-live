// Centralized league name mapping for ESPN league codes
// This provides consistent display names across the entire application

export const LEAGUE_NAMES = {
  // ESPN league codes
  'eng.1': 'Premier League',
  'esp.1': 'La Liga',
  'ita.1': 'Serie A',
  'ger.1': 'Bundesliga',
  'fra.1': 'Ligue 1',
  'uefa.champions': 'Champions League',
  'ned.1': 'Eredivisie',
  'por.1': 'Primeira Liga',
  'eng.2': 'Championship',
  'bra.1': 'Campeonato Brasileiro Série A',
  'conmebol.libertadores': 'Copa Libertadores',
  
  // Football-data.org codes (legacy)
  'PL': 'Premier League',
  'PD': 'La Liga',
  'SA': 'Serie A',
  'BL1': 'Bundesliga',
  'FL1': 'Ligue 1',
  'CL': 'Champions League',
  'DED': 'Eredivisie',
  'PPL': 'Primeira Liga',
  'ELC': 'Championship'
};

/**
 * Get display name for a league code
 * @param {string} code - ESPN league code (e.g., 'eng.1') or name with bracket notation (e.g., 'Bundesliga [ger.1]')
 * @returns {string} Display name (e.g., 'Premier League')
 */
export function getLeagueName(code) {
  if (!code) return 'Unknown League';
  
  // Handle strings with bracket notation like "Bundesliga [ger.1]"
  const bracketMatch = /^(.*?)\s*\[([^\]]+)\]$/.exec(String(code));
  if (bracketMatch) {
    const [, namePart, codePart] = bracketMatch;
    // Try to get the name from the code part first
    const nameFromCode = LEAGUE_NAMES[codePart];
    if (nameFromCode) return nameFromCode;
    // Otherwise return the name part without brackets
    return namePart.trim();
  }
  
  return LEAGUE_NAMES[code] || code;
}

/**
 * Get league code from display name or return as-is if already a code
 * @param {string} nameOrCode - League name or code
 * @returns {string} League code
 */
export function getLeagueCode(nameOrCode) {
  if (!nameOrCode) return '';
  
  // If it's already a code, return it
  if (LEAGUE_NAMES[nameOrCode]) return nameOrCode;
  
  // Find code by name
  const entry = Object.entries(LEAGUE_NAMES).find(([_, name]) => name === nameOrCode);
  return entry ? entry[0] : nameOrCode;
}

/**
 * Format competition object to ensure it has proper display name
 * @param {Object} competition - Competition object with name/code
 * @returns {Object} Competition with displayName
 */
export function formatCompetition(competition) {
  if (!competition) return { name: 'Unknown League', displayName: 'Unknown League' };
  
  const name = competition.name || competition.code || competition.id || '';
  const displayName = getLeagueName(name);
  
  return {
    ...competition,
    displayName,
    code: competition.code || name
  };
}
