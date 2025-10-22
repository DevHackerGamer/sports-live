// Check competition structures
require('dotenv').config();
const { getMatchesCollectionESPN } = require('../lib/mongodb');

(async () => {
  const col = await getMatchesCollectionESPN();
  const matches = await col.find({ 'competition.name': { $exists: true } }).limit(20).toArray();
  
  console.log('Sample competition structures:\n');
  const seen = new Set();
  matches.forEach(m => {
    const key = JSON.stringify(m.competition);
    if (!seen.has(key)) {
      seen.add(key);
      console.log(JSON.stringify(m.competition, null, 2));
      console.log('---');
    }
  });
  
  process.exit(0);
})();
