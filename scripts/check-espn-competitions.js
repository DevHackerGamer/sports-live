// Check available competitions in ESPN collection
require('dotenv').config();
const { getMatchesCollectionESPN, getTeamsCollectionESPN } = require('../lib/mongodb');

(async () => {
  try {
    console.log('🔍 Checking ESPN collections...\n');
    
    // Check competitions
    const matchesCol = await getMatchesCollectionESPN();
    const competitions = await matchesCol.distinct('competition.name', { 'competition.name': { $exists: true } });
    
    console.log('📊 Competitions in Match_Info_ESPN:');
    console.log('  Total:', competitions.length);
    console.log('\nAvailable competitions:');
    competitions.sort().forEach(c => console.log('  -', c));
    
    // Check teams
    const teamsCol = await getTeamsCollectionESPN();
    const teamCount = await teamsCol.countDocuments();
    
    console.log('\n📊 Teams in Teams_ESPN:');
    console.log('  Total:', teamCount, 'teams');
    
    // Sample teams by competition
    const sampleTeams = await teamsCol.find({}).limit(10).toArray();
    console.log('\nSample teams:');
    sampleTeams.forEach(t => {
      console.log(`  - ${t.name} (ID: ${t.id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
