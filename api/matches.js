const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');

// Import the route handler
const matchesHandler = require('../api/matches');

// Mock DB helpers
jest.mock('../lib/mongodb', () => ({
  getMatchesCollection: jest.fn(),
  getTeamsCollection: jest.fn(),
  getDatabase: jest.fn(),
}));

// Import helpers directly from matches.js
const {
  canonicalEventType,
  isScoringEvent,
  tallyScoreFromEvents,
  normalizeEvent,
  buildDescription
} = require('../api/matches');

const { getMatchesCollection, getTeamsCollection, getDatabase } = require('../lib/mongodb');

describe('helpers', () => {
  test('canonicalEventType maps aliases correctly', () => {
    expect(canonicalEventType('Goal')).toBe('goal');
    expect(canonicalEventType('penaltygoal')).toBe('penalty');
    expect(canonicalEventType('own_goal')).toBe('own_goal');
    expect(canonicalEventType('randomType')).toBe('randomtype');
  });

  test('isScoringEvent works', () => {
    expect(isScoringEvent('goal')).toBe(true);
    expect(isScoringEvent('penalty')).toBe(true);
    expect(isScoringEvent('own_goal')).toBe(true);
    expect(isScoringEvent('foul')).toBe(false);
  });

  test('tallyScoreFromEvents calculates correctly', () => {
    const match = { homeTeam: { name: 'Team A' }, awayTeam: { name: 'Team B' } };
    const events = [
      { type: 'goal', teamSide: 'home' },
      { type: 'own_goal', teamSide: 'away' },
      { type: 'penalty', team: 'Team B' },
    ];
    const result = tallyScoreFromEvents(events, match);
    expect(result).toEqual({ home: 2, away: 1 });
  });

  test('normalizeEvent fills missing fields', () => {
    const ev = { type: 'sub', playerOut: 'P1', playerIn: 'P2' };
    const normalized = normalizeEvent(ev);
    expect(normalized.type).toBe('substitution');
    expect(normalized.player).toBe('P1 → P2');
    expect(normalized.description).toContain('Substitution');
    expect(normalized.id).toBeDefined();
    expect(normalized.createdAt).toBeDefined();
  });

  test('buildDescription prefers description field', () => {
    expect(buildDescription({ description: 'Custom event' })).toBe('Custom event');
    const desc = buildDescription({ type: 'goal', team: 'Team A', player: 'Player 1' });
    expect(desc).toBe('Goal - Team A - Player 1');
  });
});

describe('GET /api/matches', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/matches', (req, res) => matchesHandler(req, res));
  });

  test('returns matches with filters applied', async () => {
    const mockMatches = [
      { id: 'm1', homeTeam: { name: 'Team A' }, awayTeam: { name: 'Team B' }, utcDate: new Date().toISOString() }
    ];
    getMatchesCollection.mockResolvedValue({
      find: () => ({
        sort: () => ({
          limit: () => ({ toArray: () => Promise.resolve(mockMatches) })
        })
      }),
      bulkWrite: jest.fn(),
    });
    getTeamsCollection.mockResolvedValue({
      find: () => ({ project: () => ({ toArray: () => Promise.resolve([]) }) })
    });
    getDatabase.mockResolvedValue({ collection: () => ({ find: () => ({ toArray: () => Promise.resolve([]) }) }) });

    const res = await request(app).get('/api/matches?status=SCHEDULED&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.filters.status).toBe('SCHEDULED');
  });

  test('handles errors gracefully', async () => {
    getMatchesCollection.mockRejectedValue(new Error('DB fail'));
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to fetch matches/);
  });
});

describe('GET /api/matches/:id', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/matches', (req, res) => matchesHandler(req, res));
  });

  test('returns single match', async () => {
    const mockMatch = { id: 'm1', homeTeam: { name: 'Team A' }, awayTeam: { name: 'Team B' } };
    getMatchesCollection.mockResolvedValue({
      findOne: jest.fn().mockResolvedValue(mockMatch)
    });
    getDatabase.mockResolvedValue({ collection: () => ({ find: () => ({ toArray: () => Promise.resolve([]) }) }) });

    const res = await request(app).get('/api/matches/m1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('m1');
  });

  test('returns 404 when not found', async () => {
    getMatchesCollection.mockResolvedValue({ findOne: jest.fn().mockResolvedValue(null), find: jest.fn() });

    const res = await request(app).get('/api/matches/mX');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Match not found/);
  });
});
