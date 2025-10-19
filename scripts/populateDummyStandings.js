// scripts/populateDummyStandings.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'sports_live';

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DATABASE_NAME);
    const standingsCollection = db.collection('LeagueStandings');
    const teamsCollection = db.collection('Teams');

    // Fetch teams from DB
    const teams = await teamsCollection.find({}).toArray();

    const leagueCodes = ['PL','SA','BL1','PD','FL1','CL'];

    const dummyStandings = leagueCodes.map((code) => {
      const table = teams
        .slice(0, 10) // take first 10 teams
        .map((team, index) => ({
          position: index + 1,
          team: { id: team.id, name: team.name, crest: team.crest },
          playedGames: 10 + index,
          won: 5 + index % 3,
          draw: 2,
          lost: 3 - index % 2,
          goalDifference: 5 + index,
          points: 17 + index * 2
        }));

      return {
        _id: `${code}-2025`,
        competition: { code, name: code },
        season: { startDate: '2025-08-01', endDate: '2026-05-31' },
        standings: [
          {
            stage: 'REGULAR_SEASON',
            type: 'TOTAL',
            table
          }
        ],
        lastUpdated: new Date()
      };
    });

    // Upsert dummy standings
    for (const league of dummyStandings) {
      await standingsCollection.updateOne(
        { _id: league._id },
        { $set: league },
        { upsert: true }
      );
      console.log(`Inserted/Updated dummy standings for ${league._id}`);
    }

    console.log('✅ Dummy standings populated successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

run();
