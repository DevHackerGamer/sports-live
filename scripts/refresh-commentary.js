// Script to refresh commentary for matches with incomplete data
require('dotenv').config();
const {
  getDatabase,
  getMatchesCollectionESPN,
  getMatchCommentaryCollectionESPN
} = require('../lib/mongodb');
const {
  fetchCoreEvent,
  fetchCoreCollectionAll,
  normalizeCoreCommentary,
  fetchSummary,
  fetchPlayByPlay
} = require('../services/espnProvider');

const LEAGUES = (process.env.ESPN_LEAGUES || 'eng.1,esp.1,ita.1,ger.1,fra.1,uefa.champions').split(',');

async function refreshCommentary() {
  try {
    console.log('🔄 Refreshing commentary for recent matches...');
    
    const matchesColl = await getMatchesCollectionESPN();
    const commentaryColl = await getMatchCommentaryCollectionESPN();
    
    // Get recent matches (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const matches = await matchesColl
      .find({
        utcDate: { $gte: sevenDaysAgo.toISOString() },
        status: { $in: ['IN_PLAY', 'FINISHED', 'PAUSED'] }
      })
      .limit(20)
      .toArray();
    
    console.log(`📊 Found ${matches.length} recent matches to refresh`);
    
    for (const match of matches) {
      try {
        console.log(`\n🔍 Processing match ${match.id}: ${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam}`);
        
        const league = match.competition?.code || LEAGUES[0];
        let commentary = [];
        
        // Build team side map
        const teamSide = {};
        const homeName = (match.homeTeam?.name || match.homeTeam || '').toString().toLowerCase();
        const awayName = (match.awayTeam?.name || match.awayTeam || '').toString().toLowerCase();
        if (homeName) teamSide[homeName] = 'home';
        if (awayName) teamSide[awayName] = 'away';
        
        // 1. Try site API first (summary + playbyplay)
        try {
          const summary = await fetchSummary(league, match.id);
          const comp = Array.isArray(summary?.header?.competitions) ? summary.header.competitions[0] : {};
          const competitors = comp?.competitors || [];
          const h = competitors.find(c=>c.homeAway==='home') || competitors[0];
          const a = competitors.find(c=>c.homeAway==='away') || competitors[1];
          if (h?.team?.displayName) teamSide[String(h.team.displayName).toLowerCase()] = 'home';
          if (a?.team?.displayName) teamSide[String(a.team.displayName).toLowerCase()] = 'away';
          
          try {
            const pbp = await fetchPlayByPlay(league, match.id);
            commentary = pbp?.commentary || pbp?.plays || [];
          } catch(_) {}
          
          if (!Array.isArray(commentary) || !commentary.length) {
            const alt = summary?.commentary || summary?.plays || [];
            if (Array.isArray(alt) && alt.length) commentary = alt;
          }
        } catch (e) {
          console.log(`  ⚠️  Site API failed: ${e.message}`);
        }
        
        // 2. Fetch Core API with ALL pages
        try {
          console.log(`  📥 Fetching Core API with all pages...`);
          const core = await fetchCoreEvent(league, match.id);
          
          if (!Object.keys(teamSide).length) {
            const compComps = Array.isArray(core?.comp?.competitors) ? core.comp.competitors : [];
            for (const c of compComps) {
              const name = c?.team?.displayName || c?.team?.name;
              const side = c?.homeAway;
              if (name && (side==='home'||side==='away')) teamSide[String(name).toLowerCase()] = side;
            }
          }
          
          // Fetch ALL pages of plays and commentaries
          const allPlays = core?.comp?.details ? await fetchCoreCollectionAll(core.comp.details.$ref || core.comp.details) : null;
          const allComm = core?.comp?.commentaries ? await fetchCoreCollectionAll(core.comp.commentaries.$ref || core.comp.commentaries) : null;
          
          console.log(`  📄 Fetched ${allPlays?.items?.length || 0} plays, ${allComm?.items?.length || 0} commentary items`);
          
          const det = allPlays && Array.isArray(allPlays.items) ? { items: allPlays.items } : core?.details;
          const com = allComm && Array.isArray(allComm.items) ? { items: allComm.items } : core?.commentaries;
          const coreEvents = normalizeCoreCommentary(det, com, teamSide) || [];
          
          if (Array.isArray(coreEvents) && coreEvents.length) {
            const combined = [...(Array.isArray(commentary)?commentary:[]), ...coreEvents];
            const seen = new Set();
            const merged = [];
            for (const c of combined) {
              const key = c?.id || `${c?.text||''}|${c?.clock?.displayValue||c?.time||''}`;
              if (seen.has(key)) continue;
              seen.add(key);
              merged.push(c);
            }
            commentary = merged;
          }
        } catch (e) {
          console.log(`  ⚠️  Core API failed: ${e.message}`);
        }
        
        if (commentary.length > 0) {
          // Normalize to UI shape with proper field mapping
          const normalized = commentary.map((c, idx) => {
            const timeVal = c?.clock?.displayValue || c?.time || '';
            const textVal = c?.text || c?.description || c?.comment || '';
            return {
              id: c?.id || `${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}`,
              time: typeof timeVal === 'object' ? (timeVal.displayValue || timeVal.value || '') : String(timeVal),
              text: textVal
            };
          }).filter(c => c.text); // Only keep items with text
          
          // Save to database
          await commentaryColl.updateOne(
            { matchId: String(match.id) },
            { 
              $set: { 
                matchId: String(match.id), 
                commentary: normalized, 
                lastUpdated: new Date() 
              } 
            },
            { upsert: true }
          );
          
          console.log(`  ✅ Saved ${normalized.length} commentary items`);
        } else {
          console.log(`  ℹ️  No commentary found`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (e) {
        console.error(`  ❌ Error processing match ${match.id}:`, e.message);
      }
    }
    
    console.log('\n✅ Commentary refresh complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

refreshCommentary();
