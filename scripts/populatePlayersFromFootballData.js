#!/usr/bin/env node
/**
 * Populate Players collection with full squads from football-data.org
 * Usage: node scripts/populatePlayersFromFootballData.js [--all] [--limit 10] [--dry]
 * Env: FOOTBALL_API_TOKEN, MONGODB_URI, DATABASE_NAME
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_TOKEN = process.env.FOOTBALL_API_TOKEN;
if (!API_TOKEN) {
  console.error('Missing FOOTBALL_API_TOKEN env var');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'sports_live';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const allFlag = args.includes('--all');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 50;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function makeApiRequest(url) {
  const res = await fetch(url, { headers: { 'X-Auth-Token': API_TOKEN } });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
  return res.json();
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DATABASE_NAME);
  const teamsCol = db.collection('Teams');
  const playersCol = db.collection('Players');

  // Ensure index
  try { await playersCol.createIndex({ teamId: 1 }); } catch {}
  try { await playersCol.createIndex({ id: 1 }, { unique: true }); } catch {}

  const teamsCursor = allFlag ? teamsCol.find({}) : teamsCol.find({ competitionCode: { $in: ['PL','PD','SA','BL1','FL1','CL'] } });
  const teams = await teamsCursor.limit(limit).toArray();
  console.log(`Processing ${teams.length} teams (dryRun=${dryRun})`);

  let totalPlayers = 0;
  for (const team of teams) {
    console.log(`Fetching squad for ${team.name} (${team.id})`);
    try {
      const data = await makeApiRequest(`https://api.football-data.org/v4/teams/${team.id}`);
      const squad = data.squad || [];
      if (!squad.length) {
        console.warn(`No squad returned for ${team.name}`);
        continue;
      }
      const ops = squad.map(p => ({
        updateOne: {
          filter: { id: p.id },
            update: { $set: {
              id: p.id,
              name: p.name,
              position: p.position,
              dateOfBirth: p.dateOfBirth,
              nationality: p.nationality,
              teamId: team.id,
              teamName: team.name,
              lastUpdated: new Date()
            }},
            upsert: true
        }
      }));
      if (!dryRun) {
        await playersCol.bulkWrite(ops);
      }
      totalPlayers += squad.length;
      console.log(`Upserted ${squad.length} players for ${team.name}`);
      await sleep(1100); // basic rate limit spacing
    } catch (e) {
      console.warn(`Failed squad fetch for team ${team.name}: ${e.message}`);
      if (/403/.test(e.message)) {
        console.error('403 encountered – stopping further fetches.');
        break;
      }
    }
  }
  console.log(`Done. Total players processed: ${totalPlayers}`);
  await client.close();
}

run().catch(e => { console.error(e); process.exit(1); });
