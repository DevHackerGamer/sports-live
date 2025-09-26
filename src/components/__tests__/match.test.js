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

const { getMatchesCollection, getTeamsCollection, getDatabase } = require('../lib/mongodb');

describe('/api/matches', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.all('/api/matches/:id?/:sub?/:eventId?', (req, res) => matchesHandler(req, res));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/matches should return matches list', async () => {
    const fakeMatches = [
      {
        id: 'm1',
        homeTeam: { id: 1, name: 'Team A' },
        awayTeam: { id: 2, name: 'Team B' },
        utcDate: new Date().toISOString(),
        competition: { name: 'Premier League' },
      },
    ];

    getMatchesCollection.mockResolvedValue({
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(fakeMatches),
      bulkWrite: jest.fn().mockResolvedValue({}),
    });

    getTeamsCollection.mockResolvedValue({
      find: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].homeTeam.name).toBe('Team A');
  });

  test('GET /api/matches/:id returns 404 if match not found', async () => {
    getMatchesCollection.mockResolvedValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).get('/api/matches/unknown123');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Match not found');
  });

  test('OPTIONS /api/matches should return 200 for preflight', async () => {
    const res = await request(app).options('/api/matches');
    expect(res.status).toBe(200);
  });

  test('GET /api/matches handles internal errors gracefully', async () => {
    getMatchesCollection.mockImplementation(() => { throw new Error('DB fail'); });

    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Failed to fetch matches');
  });
});
