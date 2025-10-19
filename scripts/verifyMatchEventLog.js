#!/usr/bin/env node
/**
 * Quick manual verification script.
 * Usage: node scripts/verifyMatchEventLog.js <matchId> [--message="Goal test"]
 */
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function main() {
  const matchId = process.argv[2];
  if (!matchId) {
    console.error('Provide a matchId.');
    process.exit(1);
  }
  const msgArg = process.argv.find(a => a.startsWith('--message='));
  const message = msgArg ? msgArg.split('=')[1] : 'Test Event';

  // Post a synthetic event via matches API (requires admin header)
  const postResp = await fetch(`http://localhost:3000/api/matches/${encodeURIComponent(matchId)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Type': 'admin' },
    body: JSON.stringify({ type: 'goal', player: 'Test Player', team: 'Home', description: message, minute: 1, matchId })
  });
  const postJson = await postResp.json();
  console.log('POST event status', postResp.status, postJson);

  // Fetch embedded match events
  const getMatch = await fetch(`http://localhost:3000/api/matches/${encodeURIComponent(matchId)}`);
  const matchJson = await getMatch.json();
  console.log('Match events length:', (matchJson.data?.events||[]).length);

  // Fetch Event_Log filtered by matchId
  const logResp = await fetch(`http://localhost:3000/api/event-log?matchId=${encodeURIComponent(matchId)}&limit=20`);
  const logJson = await logResp.json();
  console.log('Filtered log events total:', logJson.total);
  console.log(logJson.events.map(e => ({ type: e.type, message: e.message, matchId: e.matchId, dataMatch: e.data?.matchId }))); 
}

main().catch(e => { console.error(e); process.exit(1); });
