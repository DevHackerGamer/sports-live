// Live Sports Data Fetcher Service
// Fetches data from external APIs and populates MongoDB collections
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { 
  getMatchesCollection, // Now points to Match_Info
  getTeamsCollection, // Now points to Teams
  getPlayersCollection,
  getEventLogCollection,
  getDisplayStateCollection
} = require('../lib/mongodb');

class SportsDataFetcher {
  constructor() {
    this.isRunning = false;
    this.lastFetchTime = null;
    this.fetchInterval = 300000; // 5 minutes instead of 30 seconds
    this.apiToken = process.env.FOOTBALL_API_TOKEN;
    this.requestDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
  }

  // Log events to Event_Log collection
  async logEvent(type, message, data = null) {
    try {
      const eventLogCollection = await getEventLogCollection();
      await eventLogCollection.insertOne({
        timestamp: new Date(),
        type,
        message,
        data,
        source: 'dataFetcher'
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  // Helper method to make API requests with rate limiting and retries
  async makeApiRequest(url, retryCount = 0) {
    try {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      
      const response = await fetch(url, {
        headers: { 
          'X-Auth-Token': this.apiToken,
          'User-Agent': 'Sports Live App v1.0'
        }
      });

      if (response.status === 429) {
        // Rate limited - wait longer and retry
        const waitTime = Math.pow(2, retryCount) * 5000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime/1000}s before retry ${retryCount + 1}/${this.maxRetries}`);
        
        if (retryCount < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.makeApiRequest(url, retryCount + 1);
        } else {
          throw new Error(`Rate limit exceeded after ${this.maxRetries} retries`);
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (retryCount < this.maxRetries && error.message.includes('Rate limit')) {
        const waitTime = Math.pow(2, retryCount) * 5000;
        console.log(`Error: ${error.message}. Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.makeApiRequest(url, retryCount + 1);
      }
      throw error;
    }
  }

  // Update display state
  async updateDisplayState(state) {
    try {
      const displayStateCollection = await getDisplayStateCollection();
      await displayStateCollection.updateOne(
        { _id: 'main' },
        { 
          $set: { 
            ...state, 
            lastUpdated: new Date() 
          } 
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating display state:', error);
    }
  }

  // Fetch and store teams data
  async fetchAndStoreTeams() {
    try {
      await this.logEvent('INFO', 'Starting teams data fetch');
      
      if (!this.apiToken) {
        throw new Error('Football API token not configured');
      }

      // Fetch competitions first
      const compData = await this.makeApiRequest('https://api.football-data.org/v4/competitions');
      const competitions = Array.isArray(compData?.competitions) 
        ? compData.competitions.slice(0, 5) // Reduced from 10 to 5 to avoid rate limits
        : [];

      const allTeams = [];
      const teamsCollection = await getTeamsCollection();

      // Fetch teams from each competition
      for (const competition of competitions) {
        try {
          const teamsData = await this.makeApiRequest(`https://api.football-data.org/v4/competitions/${competition.code}/teams`);
          
          if (teamsData.teams && Array.isArray(teamsData.teams)) {
            const teams = teamsData.teams.map(team => ({
              id: team.id,
              name: team.name,
              shortName: team.shortName,
              tla: team.tla,
              crest: team.crest,
              address: team.address,
              website: team.website,
              founded: team.founded,
              clubColors: team.clubColors,
              venue: team.venue,
              competition: competition.name,
              competitionCode: competition.code,
              lastUpdated: new Date()
            }));
            
            allTeams.push(...teams);
          }
        } catch (error) {
          console.error(`Error fetching teams for ${competition.code}:`, error.message);
          // Continue with other competitions even if one fails
        }
      }

      // Store teams in bulk
      if (allTeams.length > 0) {
        const operations = allTeams.map(team => ({
          updateOne: {
            filter: { id: team.id },
            update: { $set: team },
            upsert: true
          }
        }));

        await teamsCollection.bulkWrite(operations);
        await this.logEvent('SUCCESS', `Stored ${allTeams.length} teams`, { count: allTeams.length });
        console.log(`✅ Stored ${allTeams.length} teams in MongoDB`);
      }

      return allTeams;
    } catch (error) {
      await this.logEvent('ERROR', 'Failed to fetch teams', { error: error.message });
      console.error('Error in fetchAndStoreTeams:', error);
      throw error;
    }
  }

  // Fetch and store matches data
  async fetchAndStoreMatches() {
    try {
      await this.logEvent('INFO', 'Starting matches data fetch');

      if (!this.apiToken) {
        throw new Error('Football API token not configured');
      }

  // Define a window: from start-of-today (UTC) to +21 days, fetched in small slices to respect API limits
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfWindowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 21));
  const dateFrom = fmtDate(startOfTodayUTC);
  const dateTo = fmtDate(endOfWindowUTC);
      const fetchWindow = async (from, to) => {
        return this.makeApiRequest(`https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`);
      };

    // Fetch in 5-7 day slices to avoid single-call limits and API constraints
      const sliceMatches = async () => {
        const all = [];
        let cursor = new Date(startOfTodayUTC);
        while (cursor < endOfWindowUTC) {
          const sliceStart = new Date(cursor);
      const sliceEnd = new Date(Date.UTC(sliceStart.getUTCFullYear(), sliceStart.getUTCMonth(), sliceStart.getUTCDate() + 5));
          const from = fmtDate(sliceStart);
          const to = fmtDate(sliceEnd <= endOfWindowUTC ? sliceEnd : endOfWindowUTC);
          try {
            const data = await fetchWindow(from, to);
            if (Array.isArray(data?.matches)) all.push(...data.matches);
          } catch (e) {
            console.warn(`Slice fetch failed ${from}..${to}:`, e.message);
          }
          cursor = sliceEnd;
        }
        // Deduplicate by id
        return Object.values(all.reduce((acc, m) => { acc[m.id] = m; return acc; }, {}));
      };

      let matches = await sliceMatches();

      // Always attempt to augment with competition-based results for broader coverage
      // Prefer competitions present in our Teams collection to avoid irrelevant leagues
      try {
        // Single-call augmentation: fetch multiple competitions at once to avoid many rate-limited calls
        const combinedFetchForCodes = async (codes = []) => {
          if (!codes.length) return [];
          const param = codes.join(',');
          try {
            const res = await this.makeApiRequest(`https://api.football-data.org/v4/matches?competitions=${encodeURIComponent(param)}&dateFrom=${dateFrom}&dateTo=${dateTo}`);
            return Array.isArray(res?.matches) ? res.matches : [];
          } catch (e) {
            // Some competitions may be unauthorized on the plan; ignore 403s
            console.warn(`Combined competitions fetch failed: ${e.message}`);
            return [];
          }
        };

        const teamsCollection = await getTeamsCollection();
        const teamCodes = (await teamsCollection.distinct('competitionCode')).filter(Boolean);
        // Also fetch available competitions and prefer top ones
        const compListResp = await this.makeApiRequest('https://api.football-data.org/v4/competitions');
        const apiCodes = Array.isArray(compListResp?.competitions)
          ? compListResp.competitions.map(c => c.code).filter(Boolean)
          : [];
        const preferredCodes = ['PL','CL','BL1','SA','PD','FL1','ELC','PPL','DED','BSA','CLF','EC'];
        const uniqueCodes = Array.from(new Set([...preferredCodes, ...teamCodes, ...apiCodes]));
        // Try a combined call with a reasonable chunk size to avoid URL length issues
        const chunks = [];
        const chunkSize = 10;
        for (let i = 0; i < uniqueCodes.length && chunks.length < 2; i += chunkSize) {
          chunks.push(uniqueCodes.slice(i, i + chunkSize));
        }

        const combinedAgg = [];
        for (const chunk of chunks) {
          const arr = await combinedFetchForCodes(chunk);
          if (arr.length) combinedAgg.push(...arr);
        }

        // If combined calls didn't bring much, try per-competition for a small selection
        const codesForSingles = uniqueCodes.slice(0, 8);
        if (combinedAgg.length === 0 && codesForSingles.length > 0) {
          const agg = [];
          for (const code of codesForSingles) {
            try {
              const compMatches = await this.makeApiRequest(`https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
              if (Array.isArray(compMatches?.matches)) agg.push(...compMatches.matches);
            } catch (e) {
              console.warn(`Comp matches failed for ${code}:`, e.message);
            }
          }
          if (agg.length) {
            const map = new Map();
            for (const m of [...matches, ...agg]) map.set(m.id, m);
            matches = Array.from(map.values());
          }
        } else if (combinedAgg.length) {
          const map = new Map();
          for (const m of [...matches, ...combinedAgg]) map.set(m.id, m);
          matches = Array.from(map.values());
        }
      } catch (e) {
        console.warn('Competition augmentation failed:', e.message);
      }

  // If still empty, keep the same window but try competitions list aggregation (legacy fallback)

      // Secondary fallback: aggregate by competitions if still empty
      if (matches.length === 0) {
        await this.logEvent('WARNING', 'No matches from /matches endpoint; aggregating per-competition');
        try {
          const compData = await this.makeApiRequest('https://api.football-data.org/v4/competitions');
      const competitions = Array.isArray(compData?.competitions) ? compData.competitions.slice(0, 6) : [];
          const agg = [];
          for (const comp of competitions) {
            try {
        const compMatches = await this.makeApiRequest(`https://api.football-data.org/v4/competitions/${comp.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
              if (Array.isArray(compMatches?.matches)) agg.push(...compMatches.matches);
            } catch (e) {
              console.warn(`Comp matches failed for ${comp.code}:`, e.message);
            }
          }
          // De-duplicate by id
          const dedup = Object.values(agg.reduce((acc, m) => { acc[m.id] = m; return acc; }, {}));
          matches = dedup;
        } catch (e) {
          console.warn('Competition aggregation failed:', e.message);
        }
      }

      if (matches.length > 0) {
        const matchInfoCollection = await getMatchesCollection();
        // Ensure indexes for performance
        try { await matchInfoCollection.createIndex({ utcDate: 1 }); } catch {}
        try { await matchInfoCollection.createIndex({ id: 1 }, { unique: false }); } catch {}
        
        // First upsert all returned matches so existing docs (and possible embedded fields like events) are preserved
        const operations = matches.map(match => ({
          updateOne: {
            filter: { id: match.id },
            update: { 
              $set: {
                id: match.id,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                competition: match.competition,
                utcDate: match.utcDate,
                status: match.status,
                matchday: match.matchday,
                stage: match.stage,
                group: match.group,
                score: match.score,
                odds: match.odds,
                referees: match.referees,
                lastUpdated: new Date()
              }
            },
            upsert: true
          }
        }));

        await matchInfoCollection.bulkWrite(operations);
        await this.logEvent('SUCCESS', `Upserted ${matches.length} matches`, { count: matches.length });
        console.log(`✅ Upserted ${matches.length} matches in MongoDB`);

        // Now remove any matches before today (strict requirement: don't keep past matches)
        try {
          const prunePast = await matchInfoCollection.deleteMany({ utcDate: { $lt: startOfTodayUTC.toISOString() } });
          if (prunePast.deletedCount) {
            console.log(`🧹 Removed ${prunePast.deletedCount} matches before today`);
            await this.logEvent('INFO', 'Removed matches before today', { deleted: prunePast.deletedCount });
          }
        } catch (e) {
          console.warn('Prune pre-today matches failed:', e.message);
        }

        // Finally, ensure the active window exactly mirrors the API by deleting any docs in the window not returned now
        try {
          const returnedIds = matches.map(m => m.id);
          const windowFilter = {
            utcDate: { $gte: startOfTodayUTC.toISOString(), $lte: endOfWindowUTC.toISOString() },
            id: { $nin: returnedIds }
          };
          const stale = await matchInfoCollection.deleteMany(windowFilter);
          if (stale.deletedCount) {
            console.log(`🧹 Removed ${stale.deletedCount} stale matches in current window`);
            await this.logEvent('INFO', 'Removed stale matches in window', { deleted: stale.deletedCount });
          }
        } catch (e) {
          console.warn('Cleanup stale window matches failed:', e.message);
        }

      } else {
        await this.logEvent('INFO', 'No matches found for current window');
        console.log('ℹ️ No matches found to store for current window');
      }

      return matches;
    } catch (error) {
      await this.logEvent('ERROR', 'Failed to fetch matches', { error: error.message });
      console.error('Error in fetchAndStoreMatches:', error);
      throw error;
    }
  }

  // Fetch and store players data
  async fetchAndStorePlayers(teamIds = []) {
    try {
      await this.logEvent('INFO', 'Starting players data fetch');

      if (!this.apiToken) {
        throw new Error('Football API token not configured');
      }

      const playersCollection = await getPlayersCollection();
      let totalPlayers = 0;

      // If no team IDs provided, get some from the database
      if (teamIds.length === 0) {
        const teamsCollection = await getTeamsCollection();
        const teams = await teamsCollection.find({}).limit(5).toArray();
        teamIds = teams.map(team => team.id);
      }

      for (const teamId of teamIds.slice(0, 2)) { // Reduced from 3 to 2 to avoid rate limits
        try {
          const teamData = await this.makeApiRequest(`https://api.football-data.org/v4/teams/${teamId}`);
          const players = teamData.squad || [];

          if (players.length > 0) {
            const operations = players.map(player => ({
              updateOne: {
                filter: { id: player.id },
                update: { 
                  $set: {
                    id: player.id,
                    name: player.name,
                    position: player.position,
                    dateOfBirth: player.dateOfBirth,
                    nationality: player.nationality,
                    teamId: teamId,
                    teamName: teamData.name,
                    lastUpdated: new Date()
                  }
                },
                upsert: true
              }
            }));

            await playersCollection.bulkWrite(operations);
            totalPlayers += players.length;
          }
        } catch (error) {
          console.error(`Error fetching players for team ${teamId}:`, error);
        }
      }

      if (totalPlayers > 0) {
        await this.logEvent('SUCCESS', `Stored ${totalPlayers} players`, { count: totalPlayers });
        console.log(`✅ Stored ${totalPlayers} players in MongoDB`);
      }

      return totalPlayers;
    } catch (error) {
      await this.logEvent('ERROR', 'Failed to fetch players', { error: error.message });
      console.error('Error in fetchAndStorePlayers:', error);
      throw error;
    }
  }

  // Main fetch cycle
  async fetchAllData() {
    if (this.isRunning) {
      console.log('Data fetch already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    await this.updateDisplayState({ 
      status: 'fetching', 
      message: 'Fetching live sports data...' 
    });

    try {
      console.log('🔄 Starting live data fetch cycle...');
      
      // Check if we have teams data already (avoid refetching if we hit rate limits)
      const teamsCollection = await getTeamsCollection();
      const existingTeamsCount = await teamsCollection.countDocuments({});
      
      if (existingTeamsCount < 50) {
        console.log(`Only ${existingTeamsCount} teams in database, fetching more...`);
        // Fetch teams first (they're needed for other data)
        await this.fetchAndStoreTeams();
      } else {
        console.log(`✅ ${existingTeamsCount} teams already in database, skipping teams fetch`);
      }
      
      // Try to fetch matches (but don't fail the whole cycle if this fails)
      try {
        await this.fetchAndStoreMatches();
      } catch (error) {
        console.log('⚠️ Matches fetch failed (possibly rate limited), continuing with other data...');
        await this.logEvent('WARNING', 'Matches fetch failed', { error: error.message });
      }
      
      // Try to fetch some players data
      try {
        const teams = await teamsCollection.find({}).limit(2).toArray();
        if (teams.length > 0) {
          const teamIds = teams.map(team => team.id);
          await this.fetchAndStorePlayers(teamIds);
        }
      } catch (error) {
        console.log('⚠️ Players fetch failed (possibly rate limited), continuing...');
        await this.logEvent('WARNING', 'Players fetch failed', { error: error.message });
      }

      this.lastFetchTime = new Date();
      await this.updateDisplayState({ 
        status: 'success', 
        message: 'Data fetch completed successfully',
        lastFetch: this.lastFetchTime
      });

      console.log('✅ Live data fetch cycle completed successfully');
    } catch (error) {
      console.error('❌ Error in data fetch cycle:', error);
      await this.updateDisplayState({ 
        status: 'error', 
        message: `Data fetch failed: ${error.message}`,
        error: error.message
      });
    } finally {
      this.isRunning = false;
    }
  }

  // Start periodic fetching
  startPeriodicFetch() {
    console.log('🚀 Starting periodic data fetching...');
    
    // Initial fetch
    this.fetchAllData();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.fetchAllData();
    }, this.fetchInterval);
  }

  // Stop periodic fetching
  stopPeriodicFetch() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Stopped periodic data fetching');
    }
  }
}

module.exports = SportsDataFetcher;
