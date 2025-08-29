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

      // Get today's matches
      const today = new Date().toISOString().split('T')[0];
      const matchesData = await this.makeApiRequest(`https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`);
      const matches = matchesData.matches || [];

      if (matches.length > 0) {
        const matchInfoCollection = await getMatchesCollection();
        
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
        await this.logEvent('SUCCESS', `Stored ${matches.length} matches`, { count: matches.length });
        console.log(`✅ Stored ${matches.length} matches in MongoDB`);
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
