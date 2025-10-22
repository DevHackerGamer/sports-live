// Script to extract events and statistics from commentary
require('dotenv').config();
const {
  getDatabase,
  getMatchesCollectionESPN,
  getMatchCommentaryCollectionESPN
} = require('../lib/mongodb');

// Event type detection patterns
const EVENT_PATTERNS = {
  goal: {
    patterns: [/\bgoal\b/i, /\bscores\b/i, /\bscored\b/i, /\bfinishes\b/i, /\bheader.*in\b/i],
    excludes: [/attempt/i, /miss/i, /saved/i, /blocked/i]
  },
  penalty: {
    patterns: [/penalty.*goal/i, /converts.*penalty/i, /penalty.*scores/i, /from the spot/i],
    excludes: [/miss/i, /saved/i]
  },
  own_goal: {
    patterns: [/own goal/i, /into.*own net/i],
    excludes: []
  },
  yellow_card: {
    patterns: [/yellow card/i, /booked/i, /cautioned/i],
    excludes: [/second yellow/i]
  },
  red_card: {
    patterns: [/red card/i, /sent off/i, /dismissed/i, /sending.off/i],
    excludes: []
  },
  second_yellow: {
    patterns: [/second yellow/i],
    excludes: []
  },
  substitution: {
    patterns: [/substitution/i, /replaces/i, /comes on/i, /\bsub\b/i, /→/],
    excludes: []
  },
  save: {
    patterns: [/\bsave\b/i, /\bsaves\b/i, /saved by/i, /stops/i],
    excludes: []
  },
  corner: {
    patterns: [/\bcorner\b/i, /corner kick/i, /conceded.*corner/i, /wins a corner/i],
    excludes: []
  },
  offside: {
    patterns: [/offside/i],
    excludes: []
  },
  foul: {
    patterns: [/\bfoul\b/i, /fouled/i, /commits a foul/i],
    excludes: [/free kick/i]
  },
  free_kick: {
    patterns: [/free kick/i, /freekick/i],
    excludes: []
  },
  shot_on_target: {
    patterns: [/shot.*on target/i, /forces.*save/i, /tests.*keeper/i],
    excludes: [/goal/i, /scores/i]
  },
  shot_off_target: {
    patterns: [/shot.*wide/i, /shot.*over/i, /effort.*wide/i, /misses.*target/i, /off target/i],
    excludes: []
  },
  blocked_shot: {
    patterns: [/blocked/i, /block/i],
    excludes: []
  }
};

// Detect event type from text
function detectEventType(text) {
  const lowerText = text.toLowerCase();
  
  for (const [eventType, { patterns, excludes }] of Object.entries(EVENT_PATTERNS)) {
    // Check if any exclude pattern matches
    if (excludes.some(pattern => pattern.test(lowerText))) {
      continue;
    }
    
    // Check if any pattern matches
    if (patterns.some(pattern => pattern.test(lowerText))) {
      return eventType;
    }
  }
  
  return null;
}

// Extract team from commentary text
function extractTeam(text, homeTeam, awayTeam) {
  const lowerText = text.toLowerCase();
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  
  // Check for team mentions
  if (lowerText.includes(homeLower)) return { name: homeTeam, side: 'home' };
  if (lowerText.includes(awayLower)) return { name: awayTeam, side: 'away' };
  
  // Check for partial matches (e.g., "Arsenal" in "Arsenal FC")
  const homeWords = homeLower.split(' ');
  const awayWords = awayLower.split(' ');
  
  for (const word of homeWords) {
    if (word.length > 4 && lowerText.includes(word)) {
      return { name: homeTeam, side: 'home' };
    }
  }
  
  for (const word of awayWords) {
    if (word.length > 4 && lowerText.includes(word)) {
      return { name: awayTeam, side: 'away' };
    }
  }
  
  // Handle common spelling variations (e.g., Olympiacos vs Olympiakos)
  const createVariations = (name) => {
    const variations = [name];
    // Replace 'c' with 'k' and vice versa for Greek team names
    if (name.includes('c')) variations.push(name.replace(/c/g, 'k'));
    if (name.includes('k')) variations.push(name.replace(/k/g, 'c'));
    // Other common variations
    if (name.includes('ü')) variations.push(name.replace(/ü/g, 'u'));
    if (name.includes('ö')) variations.push(name.replace(/ö/g, 'o'));
    if (name.includes('ä')) variations.push(name.replace(/ä/g, 'a'));
    return variations;
  };
  
  const homeVariations = createVariations(homeLower);
  const awayVariations = createVariations(awayLower);
  
  for (const variant of homeVariations) {
    if (lowerText.includes(variant)) return { name: homeTeam, side: 'home' };
  }
  
  for (const variant of awayVariations) {
    if (lowerText.includes(variant)) return { name: awayTeam, side: 'away' };
  }
  
  return { name: null, side: null };
}

// Extract player name from text
function extractPlayer(text) {
  // Look for patterns like "Name (Team)" or "Name - Team"
  const playerMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:\(|scores|assists)/);
  if (playerMatch) return playerMatch[1];
  
  // Look for "Player Name" at start
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (nameMatch) return nameMatch[1];
  
  return null;
}

// Build statistics from events
function buildStatistics(events, homeTeam, awayTeam) {
  const stats = {
    matchId: null,
    possession: { home: 50, away: 50 },
    shotsOnTarget: { home: 0, away: 0 },
    shotsOffTarget: { home: 0, away: 0 },
    totalShots: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    saves: { home: 0, away: 0 },
    lastUpdated: new Date()
  };
  
  for (const event of events) {
    const side = event.teamSide;
    if (!side) continue;
    
    switch (event.type) {
      case 'shot_on_target':
        stats.shotsOnTarget[side]++;
        stats.totalShots[side]++;
        break;
      case 'shot_off_target':
        stats.shotsOffTarget[side]++;
        stats.totalShots[side]++;
        break;
      case 'blocked_shot':
        stats.totalShots[side]++;
        break;
      case 'goal':
      case 'penalty':
        stats.shotsOnTarget[side]++;
        stats.totalShots[side]++;
        break;
      case 'own_goal':
        // Own goal counts for the opposing team
        const oppSide = side === 'home' ? 'away' : 'home';
        break;
      case 'corner':
        stats.corners[side]++;
        break;
      case 'foul':
        stats.fouls[side]++;
        break;
      case 'yellow_card':
        stats.yellowCards[side]++;
        break;
      case 'red_card':
      case 'second_yellow':
        stats.redCards[side]++;
        break;
      case 'offside':
        stats.offsides[side]++;
        break;
      case 'save':
        // Save is credited to the opposing team's goalkeeper
        const oppSaveSide = side === 'home' ? 'away' : 'home';
        stats.saves[oppSaveSide]++;
        break;
    }
  }
  
  return stats;
}

async function buildEventsFromCommentary() {
  try {
    console.log('🔄 Building events and statistics from commentary...\n');
    
    const matchesColl = await getMatchesCollectionESPN();
    const commentaryColl = await getMatchCommentaryCollectionESPN();
    const db = await getDatabase();
    const statsColl = db.collection('Match_Statistics');
    const statsCollESPN = db.collection('Match_Statistics_ESPN');
    
    // Get recent matches with commentary (including admin-created matches)
    // Since admin-created matches are now also stored in the ESPN table,
    // we process all matches regardless of source
    const recentMatches = await matchesColl
      .find({
        status: { $in: ['IN_PLAY', 'FINISHED', 'PAUSED'] }
      })
      .sort({ utcDate: -1 })
      .limit(20)
      .toArray();
    
    const adminCount = recentMatches.filter(m => m.createdByAdmin).length;
    const espnCount = recentMatches.length - adminCount;
    console.log(`📊 Found ${recentMatches.length} matches to process (${espnCount} ESPN, ${adminCount} admin-created)\n`);
    
    for (const match of recentMatches) {
      try {
        const matchType = match.createdByAdmin ? '[ADMIN]' : '[ESPN]';
        console.log(`\n🔍 ${matchType} Processing: ${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam}`);
        
        const homeTeam = match.homeTeam?.name || match.homeTeam || '';
        const awayTeam = match.awayTeam?.name || match.awayTeam || '';
        
        // Get commentary (handle both numeric and string match IDs)
        const matchIdStr = String(match.id || match._id);
        const commentaryDoc = await commentaryColl.findOne({ matchId: matchIdStr });
        if (!commentaryDoc || !commentaryDoc.commentary || commentaryDoc.commentary.length === 0) {
          console.log('  ⚠️  No commentary found, skipping...');
          continue;
        }
        
        const commentary = commentaryDoc.commentary;
        console.log(`  📝 Analyzing ${commentary.length} commentary items...`);
        
        // Extract events
        const events = [];
        const keyEvents = ['goal', 'penalty', 'own_goal', 'yellow_card', 'red_card', 'second_yellow', 'substitution'];
        
        for (const comment of commentary) {
          if (!comment.description) continue;
          
          const eventType = detectEventType(comment.description);
          if (!eventType) continue;
          
          const { name: teamName, side: teamSide } = extractTeam(comment.description, homeTeam, awayTeam);
          const player = extractPlayer(comment.description);
          
          // Parse minute from time
          let minute = comment.minute;
          if (!minute && comment.time) {
            const timeStr = typeof comment.time === 'string' ? comment.time : (comment.time?.displayValue || '');
            const stoppage = /^(\d{1,3})'\+(\d{1,2})$/.exec(timeStr);
            if (stoppage) {
              minute = parseInt(stoppage[1], 10) + parseInt(stoppage[2], 10);
            } else {
              const base = /^(\d{1,3})'?$/.exec(timeStr);
              if (base) minute = parseInt(base[1], 10);
            }
          }
          
          const event = {
            id: comment.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            type: eventType,
            time: typeof comment.time === 'string' ? comment.time : (comment.time?.displayValue || ''),
            minute: minute || 0,
            team: teamName,
            teamSide: teamSide,
            player: player,
            description: comment.description,
            createdAt: new Date().toISOString()
          };
          
          events.push(event);
        }
        
        console.log(`  ✅ Extracted ${events.length} events`);
        
        // Filter to key events for timeline
        const timelineEvents = events.filter(e => keyEvents.includes(e.type));
        console.log(`  🎯 ${timelineEvents.length} key events for timeline`);
        
        // Build statistics
        const matchIdForStats = match.id || match._id;
        const statistics = buildStatistics(events, homeTeam, awayTeam);
        statistics.matchId = matchIdForStats;
        
        console.log(`  📊 Statistics: ${statistics.shotsOnTarget.home}/${statistics.shotsOnTarget.away} shots on target, ${statistics.corners.home}/${statistics.corners.away} corners`);
        
        // Update match with events (use proper filter for both numeric and string IDs)
        const matchFilter = match._id ? { _id: match._id } : { id: match.id };
        await matchesColl.updateOne(
          matchFilter,
          { 
            $set: { 
              events: timelineEvents,
              lastUpdated: new Date()
            } 
          }
        );
        
        // Save statistics to both collections
        await statsColl.updateOne(
          { matchId: matchIdForStats },
          { $set: statistics },
          { upsert: true }
        );
        await statsCollESPN.updateOne(
          { matchId: matchIdForStats },
          { $set: statistics },
          { upsert: true }
        );
        
        console.log(`  ✅ Updated match with ${timelineEvents.length} events and statistics`);
        
      } catch (e) {
        console.error(`  ❌ Error processing match ${match.id}:`, e.message);
      }
    }
    
    console.log('\n✅ Event extraction and statistics building complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

buildEventsFromCommentary();
