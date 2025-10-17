// API client for making HTTP requests to our MongoDB-based backend
// This replaces Firebase real-time database functionality

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
  // Optional dev pass-through; in production backend should validate Clerk token
  ...(options.userType ? { 'X-User-Type': options.userType } : {}),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Matches API
  async getMatches() {
  // Request a broader upcoming window explicitly
  return this.request('/api/matches?range=10&includePast=&limit=500');
  }

  async getMatchesByDate(dateFrom, dateTo, limit = 1000) {
    const params = new URLSearchParams({ dateFrom, dateTo, limit: String(limit) });
    return this.request(`/api/matches?${params.toString()}`);
  }

  async getMatch(id) {
    return this.request(`/api/matches/${id}`);
  }
    // Alias for compatibility
    async getMatchById(id) {
      return this.getMatch(id);
    }
  
  async getMatchEvents(id) {
    return this.request(`/api/matches/${id}/events`);
  }
  
  async addMatchEvent(id, event, options = {}) {
    return this.request(`/api/matches/${id}/events`, {
      method: 'POST',
      body: event,
      ...options,
    });
  }
  
  async updateMatchEvent(id, eventId, updates, options = {}) {
    return this.request(`/api/matches/${id}/events/${eventId}`, {
      method: 'PUT',
      body: updates,
      ...options,
    });
  }
  
  async deleteMatchEvent(id, eventId, options = {}) {
    return this.request(`/api/matches/${id}/events/${eventId}`, {
      method: 'DELETE',
      ...options,
    });
  }
  
  // Update a match (accepts optional fetch options like headers)
  async updateMatch(id, updates, options = {}) {
    return this.request(`/api/matches/${id}`, {
      method: 'PUT',
      body: updates,
      ...options,
    });
  }

  // Get all news or by league
  async getFootballNews(leagueCode = null, limit = 20) {
    let url = `/api/football-news?limit=${limit}`;
    if (leagueCode) url += `&leagueCode=${leagueCode}`;
    return this.request(url);
  }
// Get football highlights
async getFootballHighlights(leagueName) {
  return this.request(`/api/football-highlights?leagueName=${encodeURIComponent(leagueName)}`);
}


  async createMatches(matches) {
    return this.request('/api/matches', {
      method: 'POST',
      body: { matches },
    });
  }

  // (Legacy duplicate removed – single updateMatch above handles this)

  async deleteMatch(id) {
    return this.request(`/api/matches/${id}`, {
      method: 'DELETE',
    });
  }

  // Match Statistics API
  async getMatchStatistics(matchId) {
    return this.request(`/api/match-statistics?matchId=${encodeURIComponent(matchId)}`);
  }

  async createMatchStatistics(matchId, statistics) {
    return this.request('/api/match-statistics', {
      method: 'POST',
      body: { matchId, ...statistics },
    });
  }

  async updateMatchStatistics(matchId, statistics) {
    return this.request('/api/match-statistics', {
      method: 'PUT',
      body: { matchId, ...statistics },
    });
  }

  async deleteMatchStatistics(matchId) {
    return this.request(`/api/match-statistics?matchId=${encodeURIComponent(matchId)}`, {
      method: 'DELETE',
    });
  }

  // Reports API - recognize change`
async getReports(id) {
  if (id) {
    return this.request(`/api/reporting/${id}`);
  }
  return this.request('/api/reporting');
}

async createReport(report) {
  return this.request('/api/reporting', {
    method: 'POST',
    body: report,
  });
}

async updateReport(id, updates) {
  return this.request(`/api/reporting/${id}`, {
    method: 'PUT',
    body: updates,
  });
}

async deleteReport(id) {
  return this.request(`/api/reporting/${id}`, {
    method: 'DELETE',
  });
}


  // Teams API
  async getTeams() {
    return this.request('/api/teams');
  }

  async createTeams(teams) {
    return this.request('/api/teams', {
      method: 'POST',
      body: { teams },
    });
  }
  async getTeamById(id) {
  return this.request(`/api/teams?id=${id}`);
}

  //standings API

  // Standings API
    async getStandings({ competition, season, type, stage, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (competition) params.append('competition', competition);
    if (season) params.append('season', season);
    if (type) params.append('type', type);
    if (stage) params.append('stage', stage);
    params.append('limit', limit);

    return this.request(`/api/standings?${params.toString()}`);
  }

  async getStandingById(id) {
    return this.request(`/api/standings/${id}`);
  }

  // Users API
  async getUserFavorites(userId) {
    return this.request(`/api/users/${userId}/favorites`);
  }

  async addUserFavorite(userId, teamName) {
    return this.request(`/api/users/${userId}/favorites`, {
      method: 'POST',
      body: { teamName },
    });
  }

  async removeUserFavorite(userId, teamName) {
  const encoded = encodeURIComponent(teamName);
  return this.request(`/api/users/${userId}/favorites/${encoded}`, {
      method: 'DELETE',
    });
  }

  async updateUserFavorites(userId, favorites) {
    return this.request(`/api/users/${userId}/favorites`, {
      method: 'PUT',
      body: { favorites },
    });
  }

  async getEventLog(params = {}) {
    const qs = new URLSearchParams();
    if (params.limit) qs.append('limit', String(params.limit));
    if (params.type) qs.append('type', params.type);
    if (params.matchId) qs.append('matchId', params.matchId);
    if (params.startDate) qs.append('startDate', params.startDate);
    if (params.endDate) qs.append('endDate', params.endDate);
    const query = qs.toString();
    return this.request(`/api/event-log${query ? '?' + query : ''}`);
  }

  // User Watchlist (Matches)
  async getUserWatchlist(userId) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    return this.request(`/api/user-matches?${params.toString()}`);
  }

  async addUserMatch(userId, match) {
    const matchId = match?.id || match?._id || match?.matchId;
    if (!matchId) throw new Error('matchId required');
    return this.request('/api/user-matches', {
      method: 'POST',
      body: { userId, matchId, match },
    });
  }

  async removeUserMatch(userId, matchId) {
    const qs = new URLSearchParams({ userId, matchId: String(matchId) });
    return this.request(`/api/user-matches?${qs.toString()}`, { method: 'DELETE' });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

// Real-time data simulation using polling
class RealTimeData {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.subscriptions = new Map();
    this.intervals = new Map();
  }

  // Simulate Firebase onValue with polling
  onValue(endpoint, callback, errorCallback, pollInterval = 30000) {
    const id = Math.random().toString(36);
    
    // Initial fetch
    this.fetchAndNotify(endpoint, callback, errorCallback);
    
    // Set up polling
    const intervalId = setInterval(() => {
      this.fetchAndNotify(endpoint, callback, errorCallback);
    }, pollInterval);
    
    this.intervals.set(id, intervalId);
    this.subscriptions.set(id, { endpoint, callback, errorCallback });
    
    // Return unsubscribe function
    return () => {
      if (this.intervals.has(id)) {
        clearInterval(this.intervals.get(id));
        this.intervals.delete(id);
      }
      this.subscriptions.delete(id);
    };
  }

  async fetchAndNotify(endpoint, callback, errorCallback) {
    try {
      let data;
      switch (endpoint) {
        case 'matches':
          data = await this.apiClient.getMatches();
          // Convert array to object with IDs as keys (Firebase-like structure)
          const matchesObj = {};
          data.data.forEach(match => {
            matchesObj[match.id] = match;
          });
          callback({ val: () => matchesObj });
          break;
        case 'teams':
          data = await this.apiClient.getTeams();
          callback({ val: () => data.data });
          break;
        default:
          if (endpoint.startsWith('users/') && endpoint.includes('/favorites')) {
            const userId = endpoint.split('/')[1];
            data = await this.apiClient.getUserFavorites(userId);
            callback({ val: () => data.data });
          }
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (errorCallback) {
        errorCallback(error);
      }
    }
  }

  // Clean up all subscriptions
  cleanup() {
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals.clear();
    this.subscriptions.clear();
  }
}

const realTimeData = new RealTimeData(apiClient);

// Firebase-compatible API
export const db = {
  // Placeholder for compatibility
};

export const ref = (db, path) => {
  return { path };
};

export const onValue = (ref, callback, errorCallback) => {
  const path = ref.path;
  return realTimeData.onValue(path, callback, errorCallback);
};

export const update = async (ref, data) => {
  const path = ref.path;
  
  if (path.startsWith('users/') && path.includes('/favorites')) {
    const userId = path.split('/')[1];
    await apiClient.updateUserFavorites(userId, data.favorites);
  } else if (path === 'matches') {
    // Handle bulk match updates
    const matchesArray = Object.values(data);
    await apiClient.createMatches(matchesArray);
  } else if (path === 'teams') {
    await apiClient.createTeams(data);
  }
};

export const set = async (ref, data) => {
  return update(ref, data);
};

export const get = async (ref) => {
  const path = ref.path;
  
  try {
    let data;
    switch (path) {
      case 'matches':
        data = await apiClient.getMatches();
        return { val: () => data.data };
      case 'teams':
        data = await apiClient.getTeams();
        return { val: () => data.data };
      default:
        if (path.startsWith('users/') && path.includes('/favorites')) {
          const userId = path.split('/')[1];
          data = await apiClient.getUserFavorites(userId);
          return { val: () => data.data };
        }
        return { val: () => null };
    }
  } catch (error) {
    console.error('Error getting data:', error);
    return { val: () => null };
  }
};

export const child = (ref, path) => {
  return { path: `${ref.path}/${path}` };
};

// Export API client for direct use
export { apiClient, realTimeData };
// Export getMatchById for direct use
export const getMatchById = (id) => apiClient.getMatchById(id);

export default {
  db,
  ref,
  onValue,
  update,
  set,
  get,
  child,
  apiClient,
  realTimeData,
};
