// Check admin matches in both collections
require('dotenv').config();
const { getMatchesCollection, getMatchesCollectionESPN } = require('../lib/mongodb');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    const matchesCollection = await getMatchesCollection();
    const matchesCollectionESPN = await getMatchesCollectionESPN();
    
    // Count admin matches in both collections
    const regularCount = await matchesCollection.countDocuments({ createdByAdmin: true });
    const espnCount = await matchesCollectionESPN.countDocuments({ createdByAdmin: true });
    
    console.log('\n📊 Admin Match Counts:');
    console.log('  Match_Info (regular):', regularCount);
    console.log('  Match_Info_ESPN:', espnCount);
    
    // Get sample from each collection
    console.log('\n📋 Sample admin matches from Match_Info:');
    const sampleRegular = await matchesCollection.find({ createdByAdmin: true }).limit(3).toArray();
    sampleRegular.forEach(m => {
      console.log(`  - ${m.homeTeam?.name} vs ${m.awayTeam?.name} (${m.date} ${m.time}) [ID: ${m.id}]`);
    });
    
    console.log('\n📋 Sample admin matches from Match_Info_ESPN:');
    const sampleESPN = await matchesCollectionESPN.find({ createdByAdmin: true }).limit(3).toArray();
    if (sampleESPN.length === 0) {
      console.log('  ❌ NO ADMIN MATCHES FOUND IN ESPN COLLECTION!');
    } else {
      sampleESPN.forEach(m => {
        console.log(`  - ${m.homeTeam?.name} vs ${m.awayTeam?.name} (${m.date} ${m.time}) [ID: ${m.id}]`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
