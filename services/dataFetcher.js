// Live Sports Data Fetcher Service
// Fetches data from external APIs and populates MongoDB collections
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { 
  getMatchesCollection, // Now points to Match_Info
  getTeamsCollection, // Now points to Teams
  getPlayersCollection,
  getDisplayStateCollection,
  getFootballHighlightsCollection,
  getDatabase
} = require('../lib/mongodb');

class SportsDataFetcher {
  constructor() {
    this.isRunning = false;
    this.lastFetchTime = null;
    this.fetchInterval = 300000; // 5 minutes instead of 30 seconds
    this.apiToken = process.env.FOOTBALL_API_TOKEN;
    this.requestDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
    this.apiDisabled = false; // set to true if we detect 403 disabled
    this.fetcherEnabled = String(process.env.FETCHER_ENABLED || 'true').toLowerCase() !== 'false';
  }

  // Log service/app telemetry to System_Log (keep Event_Log strictly for match events)
  async logEvent(type, message, data = null) {
    try {
      const db = await getDatabase();
      const systemLog = db.collection('System_Log');
      await systemLog.insertOne({
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
      if (this.apiDisabled) {
        throw new Error('API disabled');
      }
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
        if (response.status === 403) {
          // capture body snippet for logs
          let body = '';
          try { body = await response.text(); } catch {}
          if (!this.apiDisabled) {
            console.error(`football-data.org 403: ${body?.slice?.(0, 200) || ''}`);
            console.error('Disabling external fetcher until process restart. Please fix your account/token.');
          }
          this.apiDisabled = true; // short-circuit further calls in this process
          // stop periodic fetch if running
          this.stopPeriodicFetch();
          throw new Error('API request failed: 403');
        }
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
      
      if (!this.apiToken || this.apiDisabled) {
        throw new Error('Football API token not configured or API disabled');
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
  // Fetch and store football news data
async fetchAndStoreFootballNews() {
  try {
    await this.logEvent('INFO', 'Starting football news fetch');

    const leagues = [
      { code: 'eng.1', name: 'Premier League' },
      { code: 'esp.1', name: 'La Liga' },
      { code: 'ita.1', name: 'Serie A' },
      { code: 'ger.1', name: 'Bundesliga' },
      { code: 'fra.1', name: 'Ligue 1' },
      { code: 'uefa.champions', name: 'Champions League' },
    ];

    const { getFootballNewsCollection } = require('../lib/mongodb');
    const newsCollection = await getFootballNewsCollection();

    let totalArticles = 0;

    for (const league of leagues) {
      const url = `http://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/news`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (!Array.isArray(data.articles)) continue;

        const articles = data.articles.map(article => ({
          _id: article?.guid || article?.id || `${league.code}-${Date.now()}-${Math.random()}`,
          leagueCode: league.code,
          leagueName: league.name,
          headline: article.headline,
          description: article.description,
          published: article.published,
          byline: article.byline || null,
          link: article.links?.web?.href || null,
          images: article.images?.map(img => ({
            url: img.url,
            caption: img.caption,
            width: img.width,
            height: img.height
          })) || [],
          categories: article.categories?.map(c => c.description) || [],
          related: article.related || [],
          lastUpdated: new Date()
        }));

        if (articles.length > 0) {
          const ops = articles.map(a => ({
            updateOne: {
              filter: { _id: a._id },
              update: { $set: a },
              upsert: true
            }
          }));

          await newsCollection.bulkWrite(ops);
          totalArticles += articles.length;

          console.log(`🗞️ Stored ${articles.length} news articles for ${league.name}`);
        }

        await new Promise(res => setTimeout(res, 1000)); // avoid overloading ESPN
      } catch (err) {
        console.warn(`⚠️ Failed to fetch news for ${league.name}:`, err.message);
      }
    }

    await this.logEvent('SUCCESS', `Stored ${totalArticles} football news articles`, { count: totalArticles });
    console.log(`✅ Stored ${totalArticles} news articles in MongoDB`);

    return totalArticles;
  } catch (error) {
    await this.logEvent('ERROR', 'Failed to fetch football news', { error: error.message });
    console.error('Error in fetchAndStoreFootballNews:', error);
    throw error;
  }
}



  // Fetch and store league standings
async fetchAndStoreStandings() {
  try {
    await this.logEvent('INFO', 'Starting standings data fetch');

    if (!this.apiToken || this.apiDisabled) {
      throw new Error('Football API token not configured or API disabled');
    }

    const competitions = ['PL', 'SA', 'BL1', 'PD', 'FL1', 'CL']; // leagues you want

    const standingsCollection = await require('../lib/mongodb').getStandingsCollection();
    let totalStandings = 0;

    for (const code of competitions) {
      try {
        const data = await this.makeApiRequest(`https://api.football-data.org/v4/competitions/${code}/standings`);
        if (data.standings && Array.isArray(data.standings)) {
          let seasonYear = '2025';
          if (data.season?.startDate) {
             seasonYear = new Date(data.season.startDate).getUTCFullYear().toString();
               }    
            else if (data.season?.endDate) {
             seasonYear = new Date(data.season.endDate).getUTCFullYear().toString();
       }
          const doc = {
            _id: `${code}-${seasonYear}`,
            area: data.area,
            competition: data.competition,
            season: data.season,
            standings: data.standings,
            lastUpdated: new Date()
          };


          await standingsCollection.updateOne(
            { _id: doc._id },
            { $set: doc },
            { upsert: true }
          );

          totalStandings++;
        }
        console.log("Fetched competition:", code, data.competition?.code, data.competition?.name);

      } catch (err) {
        console.warn(`Failed to fetch standings for ${code}:`, err.message);
      }
    }

    await this.logEvent('SUCCESS', `Stored ${totalStandings} standings`, { count: totalStandings });
    console.log(`✅ Stored ${totalStandings} standings in MongoDB`);
    return totalStandings;

  } catch (error) {
    await this.logEvent('ERROR', 'Failed to fetch standings', { error: error.message });
    console.error('Error in fetchAndStoreStandings:', error);
    throw error;
  }
}
// Fetch and store YouTube highlights
async fetchAndStoreFootballHighlights() {
  console.log('🎥 Fetching football highlights...');

  const leagues = [
    { name: 'Premier League', channelId: 'UCxZf3zG2q1oVmtz0gW1yj9Q' },
    { name: 'Champions League', channelId: 'UCpcTrCXblq78GZrTUTLWeBw' },
    { name: 'La Liga', channelId: 'UCxm7h3Jv2uG0d6zOQeqnqTw' },
    { name: 'Serie A', channelId: 'UCz1hQvN3E_0gxH3JUbj3c1Q' },
    { name: 'Ligue 1', channelId: 'UC-VK0tmIu3W2oKMzOJDC0pQ' },
    { name: 'Bundesliga', channelId: 'UCVCx8sY5ETRWRzYzYkz3rTQ' },
  ];

  const apiKey = process.env.REACT_APP_YT_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ Missing REACT_APP_YT_API_KEY in environment.');
    return;
  }

  const highlightsCollection = await getFootballHighlightsCollection();

  for (const league of leagues) {
    try {
      console.log(`▶ Fetching highlights for ${league.name}`);

      // 1️⃣ Try official channel first
      const channelUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      channelUrl.search = new URLSearchParams({
        part: 'snippet',
        channelId: league.channelId,
        q: 'highlights',
        type: 'video',
        order: 'date',
        videoDuration: 'short',
        maxResults: '12',
        key: apiKey,
      });

      const channelRes = await fetch(channelUrl);
      const channelData = await channelRes.json();

      let videos = channelData.items || [];

      // 2️⃣ Fallback search if channel is empty
      if (!videos.length) {
        console.warn(`No channel highlights for ${league.name}, using search fallback.`);
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.search = new URLSearchParams({
          part: 'snippet',
          q: `${league.name} football 2025/26 highlights`,
          type: 'video',
          order: 'relevance',
          videoDuration: 'short',
          maxResults: '12',
          key: apiKey,
        });
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        videos = searchData.items || [];
      }

      if (!videos.length) continue;

      // Prepare DB docs
      const docs = videos.map(v => ({
        leagueName: league.name,
        videoId: v.id.videoId,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail:
          v.snippet.thumbnails.high?.url || v.snippet.thumbnails.medium?.url,
        channelTitle: v.snippet.channelTitle,
        publishedAt: v.snippet.publishedAt,
        fetchedAt: new Date(),
      }));

      // Save in Mongo (replace old league data)
      await highlightsCollection.deleteMany({ leagueName: league.name });
      await highlightsCollection.insertMany(docs);

      console.log(`✅ Saved ${docs.length} ${league.name} highlights`);
    } catch (err) {
      console.error(`❌ Error fetching highlights for ${league.name}:`, err.message);
    }
  }
}



  // Fetch and store matches data
  async fetchAndStoreMatches() {
    try {
      await this.logEvent('INFO', 'Starting matches data fetch');

      if (!this.apiToken || this.apiDisabled) {
        throw new Error('Football API token not configured or API disabled');
      }

  // Define a window: from start-of-today (UTC) to +21 days, fetched in small slices to respect API limits
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfWindowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 14));
  const dateFrom = fmtDate(startOfTodayUTC);
  const dateTo = fmtDate(endOfWindowUTC);
      const fetchWindow = async (from, to) => {
        return this.makeApiRequest(`https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`);
      };

  // Fetch in 7-day slices to minimize calls and respect limits (two slices for 14 days)
      const sliceMatches = async () => {
        const all = [];
        let cursor = new Date(startOfTodayUTC);
        while (cursor < endOfWindowUTC) {
          const sliceStart = new Date(cursor);
    const sliceEnd = new Date(Date.UTC(sliceStart.getUTCFullYear(), sliceStart.getUTCMonth(), sliceStart.getUTCDate() + 7));
          const from = fmtDate(sliceStart);
          const to = fmtDate(sliceEnd <= endOfWindowUTC ? sliceEnd : endOfWindowUTC);
          try {
            const data = await fetchWindow(from, to);
            if (Array.isArray(data?.matches)) all.push(...data.matches);
          } catch (e) {
            console.warn(`Slice fetch failed ${from}..${to}:`, e.message);
          }
      // brief delay between slices to stay under per-minute limit
      await new Promise(r => setTimeout(r, this.requestDelay));
          cursor = sliceEnd;
        }
        // Deduplicate by id
        return Object.values(all.reduce((acc, m) => { acc[m.id] = m; return acc; }, {}));
      };
    const matches = await sliceMatches();

  if (matches.length > 0) {
        const matchInfoCollection = await getMatchesCollection();
        // Ensure indexes for performance
        try { await matchInfoCollection.createIndex({ utcDate: 1 }); } catch {}
        try { await matchInfoCollection.createIndex({ id: 1 }, { unique: false }); } catch {}
        
        // Snapshot existing docs before upsert to detect score deltas
        const incomingIds = matches.map(m => m.id);
        const prevDocs = await matchInfoCollection
          .find({ id: { $in: incomingIds } })
          .project({ id:1, score:1, homeScore:1, awayScore:1, events:1, homeTeam:1, awayTeam:1 })
          .toArray();
        const prevById = new Map(prevDocs.map(m => [m.id, m]));

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
          // Do not prune admin-created matches (keep historical admin entries)
          const prunePast = await matchInfoCollection.deleteMany({ utcDate: { $lt: startOfTodayUTC.toISOString() }, createdByAdmin: { $ne: true } });
          if (prunePast.deletedCount) {
            console.log(`🧹 Removed ${prunePast.deletedCount} matches before today`);
            await this.logEvent('INFO', 'Removed matches before today', { deleted: prunePast.deletedCount });
          }
        } catch (e) {
          console.warn('Prune pre-today matches failed:', e.message);
        }

    // After upsert, detect score changes to auto-log implicit goals from external feed
        try {
          const db = await getDatabase();
          const eventLog = db.collection('Event_Log');
          for (const m of matches) {
      const prev = prevById.get(m.id);
      const oldHome = prev?.score?.fullTime?.home ?? prev?.homeScore ?? 0;
      const oldAway = prev?.score?.fullTime?.away ?? prev?.awayScore ?? 0;
            const newHome = m?.score?.fullTime?.home ?? 0;
            const newAway = m?.score?.fullTime?.away ?? 0;
            const deltaHome = Math.max(0, newHome - oldHome);
            const deltaAway = Math.max(0, newAway - oldAway);
            const toInsert = [];
            for (let i=0;i<deltaHome;i++) {
              toInsert.push({ type: 'goal', teamSide: 'home' });
            }
            for (let i=0;i<deltaAway;i++) {
              toInsert.push({ type: 'goal', teamSide: 'away' });
            }
            if (toInsert.length) {
              const now = new Date();
              const matchId = m.id;
              const teamName = (side) => side === 'home' ? (m.homeTeam?.name || m.homeTeam) : (m.awayTeam?.name || m.awayTeam);
              for (const ev of toInsert) {
                const desc = `Goal - ${teamName(ev.teamSide)}`;
                const norm = {
                  id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                  type: 'goal',
                  minute: undefined,
                  time: undefined,
                  team: teamName(ev.teamSide),
                  teamSide: ev.teamSide,
                  player: '',
                  description: desc,
                  createdAt: now.toISOString()
                };
                try {
                  // Append to match document events
                  await matchInfoCollection.updateOne({ id: matchId }, { $push: { events: norm } });
                } catch {}
                try {
                  // Also log into Event_Log with scoreAfter snapshot approximation
                  await eventLog.insertOne({
                    timestamp: now,
                    type: 'goal',
                    message: desc,
                    data: { ...norm, matchId },
                    source: 'external_feed'
                  });
                } catch {}
              }
            }
          }
        } catch (e) {
          console.warn('Implicit goal logging failed:', e.message);
        }

        // Finally, ensure the active window exactly mirrors the API by deleting any docs in the window not returned now
        try {
          const returnedIds = matches.map(m => m.id);
          const windowFilter = {
            utcDate: { $gte: startOfTodayUTC.toISOString(), $lte: endOfWindowUTC.toISOString() },
            id: { $nin: returnedIds },
            createdByAdmin: { $ne: true } // never delete admin-created inside active window
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
        await this.logEvent('INFO', this.apiDisabled ? 'API disabled; no matches fetched' : 'No matches found for current window');
        console.log(this.apiDisabled ? 'ℹ️ API disabled; no matches fetched' : 'ℹ️ No matches found to store for current window');
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

      if (!this.apiToken || this.apiDisabled) {
        throw new Error('Football API token not configured or API disabled');
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

  // Bulk refresh players for all (or filtered) teams; careful with rate limits
  async refreshAllPlayers({ limit = 80, competitions = ['PL','PD','SA','BL1','FL1','CL'], delayMs = 1200 } = {}) {
    if (!this.apiToken || this.apiDisabled) {
      throw new Error('Football API token not configured or API disabled');
    }
    const playersCollection = await getPlayersCollection();
    const teamsCollection = await getTeamsCollection();
    const query = competitions && competitions.length ? { competitionCode: { $in: competitions } } : {};
    const teams = await teamsCollection.find(query).limit(limit).toArray();
    let total = 0;
    for (const team of teams) {
      try {
        const data = await this.makeApiRequest(`https://api.football-data.org/v4/teams/${team.id}`);
        const squad = data.squad || [];
        if (!squad.length) {
          console.warn(`No squad returned for ${team.name}`);
          continue;
        }
        const ops = squad.map(p => ({
          updateOne: {
            filter: { id: p.id },
            update: { $set: { id: p.id, name: p.name, position: p.position, dateOfBirth: p.dateOfBirth, nationality: p.nationality, teamId: team.id, teamName: team.name, lastUpdated: new Date() } },
            upsert: true
          }
        }));
        await playersCollection.bulkWrite(ops);
        total += squad.length;
        console.log(`Refreshed ${squad.length} players for ${team.name}`);
        await new Promise(r => setTimeout(r, delayMs));
      } catch (e) {
        console.warn(`refreshAllPlayers: failed for ${team.name}: ${e.message}`);
        if (/403/.test(e.message)) { this.apiDisabled = true; break; }
      }
    }
    return total;
  }

  // Fetch squads only for teams that currently have zero players in Players collection
  async populateMissingTeamSquads({ minThreshold = 1, batchLimit = 10, delayMs = 1300 } = {}) {
    if (!this.apiToken || this.apiDisabled) return { processed: 0, added: 0 };
    const playersCollection = await getPlayersCollection();
    const teamsCollection = await getTeamsCollection();
    // Identify teams without any players stored
    const pipeline = [
      { $group: { _id: '$teamId', count: { $sum: 1 } } }
    ];
    const counts = await playersCollection.aggregate(pipeline).toArray();
    const countsMap = counts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
    // Pull candidate teams (focus on major competitions to reduce volume)
    const majorTeams = await teamsCollection.find({ competitionCode: { $in: ['PL','PD','SA','BL1','FL1','CL'] } }).toArray();
    const missing = majorTeams.filter(t => !countsMap[t.id] || countsMap[t.id] < minThreshold).slice(0, batchLimit);
    if (!missing.length) {
      console.log('🔎 No missing team squads detected');
      return { processed: 0, added: 0 };
    }
    console.log(`🩹 Populating squads for ${missing.length} teams lacking players`);
    let added = 0;
    for (const team of missing) {
      try {
        const data = await this.makeApiRequest(`https://api.football-data.org/v4/teams/${team.id}`);
        const squad = data.squad || [];
        if (!squad.length) {
          console.warn(`No squad returned for missing team ${team.name}`);
          continue;
        }
        const ops = squad.map(p => ({
          updateOne: {
            filter: { id: p.id },
            update: { $set: { id: p.id, name: p.name, position: p.position, dateOfBirth: p.dateOfBirth, nationality: p.nationality, teamId: team.id, teamName: team.name, lastUpdated: new Date() } },
            upsert: true
          }
        }));
        await playersCollection.bulkWrite(ops);
        added += squad.length;
        console.log(`➕ Added ${squad.length} players for previously empty team ${team.name}`);
        await new Promise(r => setTimeout(r, delayMs));
      } catch (e) {
        console.warn(`populateMissingTeamSquads failed ${team.name}: ${e.message}`);
        if (/403/.test(e.message)) { this.apiDisabled = true; break; }
      }
    }
    return { processed: missing.length, added };
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
        console.log('⚠️ Matches fetch failed (possibly rate limited or API disabled), continuing with other data...');
        await this.logEvent('WARNING', 'Matches fetch failed', { error: error.message });
      }
      // Fetch standings
try {
    if (!this.apiDisabled) {
    await this.fetchAndStoreStandings();
    }
  } catch (error) {
   console.log('⚠️ Standings fetch failed (possibly rate limited), continuing...');
  await this.logEvent('WARNING', 'Standings fetch failed', { error: error.message });
}


      
      // Try to fetch some players data
      try {
        if (this.apiDisabled) {
          console.log('⏭️ Skipping players fetch: API disabled');
        } else {
          const teams = await teamsCollection.find({}).limit(2).toArray();
          if (teams.length > 0) {
            const teamIds = teams.map(team => team.id);
            await this.fetchAndStorePlayers(teamIds);
          }
          // After base subset fetch, attempt to backfill missing high-profile squads
          try {
            const result = await this.populateMissingTeamSquads({ minThreshold: 5, batchLimit: 6 });
            if (result.processed) {
              console.log(`🧩 Missing squad backfill processed=${result.processed} addedPlayers=${result.added}`);
            }
          } catch (bfErr) {
            console.warn('Backfill missing squads failed:', bfErr.message);
          }
        }
      } catch (error) {
        console.log('⚠️ Players fetch failed (possibly rate limited), continuing...');
        await this.logEvent('WARNING', 'Players fetch failed', { error: error.message });
      }
     
// Fetch football news 
try {
  if (!this.apiDisabled) {
    await this.fetchAndStoreFootballNews();
  } else {
    console.log('⏭️ Skipping football news fetch: API disabled');
  }
} catch (err) {
  console.warn('⚠️ Football news fetch failed:', err.message);
  await this.logEvent('WARNING', 'Football news fetch failed', { error: err.message });
}
// Fetch football highlights
try {
  if (!this.apiDisabled) {
    await this.fetchAndStoreFootballHighlights();
  } else {
    console.log('⏭️ Skipping highlights fetch: API disabled');
  }
} catch (err) {
  console.warn('⚠️ Highlights fetch failed:', err.message);
  await this.logEvent('WARNING', 'Highlights fetch failed', { error: err.message });
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
// export 
module.exports = SportsDataFetcher;