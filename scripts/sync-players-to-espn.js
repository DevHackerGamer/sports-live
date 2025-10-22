// Script to sync players from Players collection to Players_ESPN collection
require('dotenv').config();
const { getPlayersCollection, getPlayersCollectionESPN } = require('../lib/mongodb');

async function syncPlayersToESPN() {
  try {
    console.log('🔄 Syncing players from Players to Players_ESPN collection...\n');
    
    const playersColl = await getPlayersCollection();
    const playersCollESPN = await getPlayersCollectionESPN();
    
    // Get all players from regular collection
    const allPlayers = await playersColl.find({}).toArray();
    console.log(`📊 Found ${allPlayers.length} players in Players collection`);
    
    if (allPlayers.length === 0) {
      console.log('⚠️  No players to sync');
      process.exit(0);
    }
    
    // Check what's already in ESPN collection
    const espnCount = await playersCollESPN.countDocuments();
    console.log(`📊 Players_ESPN collection currently has ${espnCount} players`);
    
    // Sync players in batches
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    
    console.log('\n🔄 Syncing players...');
    
    for (const player of allPlayers) {
      try {
        const filter = { id: player.id };
        const existing = await playersCollESPN.findOne(filter);
        
        if (existing) {
          // Update existing
          await playersCollESPN.updateOne(
            filter,
            { $set: { ...player, lastUpdated: new Date() } }
          );
          updated++;
        } else {
          // Insert new
          await playersCollESPN.insertOne({
            ...player,
            lastUpdated: new Date()
          });
          inserted++;
        }
        
        if ((inserted + updated + skipped) % 100 === 0) {
          console.log(`  Progress: ${inserted + updated + skipped}/${allPlayers.length} players processed...`);
        }
      } catch (e) {
        console.error(`  ❌ Error syncing player ${player.name}:`, e.message);
        skipped++;
      }
    }
    
    console.log('\n✅ Sync complete!');
    console.log(`  ➕ Inserted: ${inserted} players`);
    console.log(`  ♻️  Updated: ${updated} players`);
    console.log(`  ⏭️  Skipped: ${skipped} players`);
    
    const finalCount = await playersCollESPN.countDocuments();
    console.log(`\n📊 Players_ESPN collection now has ${finalCount} players`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

syncPlayersToESPN();
