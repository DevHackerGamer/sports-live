#!/usr/bin/env node
/**
 * Sync admin-created matches from Match_Info to Match_Info_ESPN
 * This is a one-time migration to populate ESPN collection with existing admin matches
 */

require('dotenv').config();
const { getMatchesCollection, getMatchesCollectionESPN } = require('../lib/mongodb');

async function syncAdminMatches() {
  console.log('🔄 Syncing admin-created matches to ESPN collection...\n');
  
  try {
    const matchesCollection = await getMatchesCollection();
    const matchesCollectionESPN = await getMatchesCollectionESPN();
    
    // Find all admin matches in regular collection
    const adminMatches = await matchesCollection
      .find({ createdByAdmin: true })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`📊 Found ${adminMatches.length} admin matches in Match_Info`);
    
    if (adminMatches.length === 0) {
      console.log('✅ No admin matches to sync');
      return;
    }
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const match of adminMatches) {
      try {
        // Check if match already exists in ESPN collection
        const existing = await matchesCollectionESPN.findOne({ id: match.id });
        
        if (existing) {
          // Update existing match to ensure it has latest data
          const result = await matchesCollectionESPN.updateOne(
            { id: match.id },
            { $set: match }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`  ♻️  Updated: ${match.homeTeam?.name} vs ${match.awayTeam?.name} (${match.id})`);
            updated++;
          } else {
            console.log(`  ⏭️  Skipped (unchanged): ${match.homeTeam?.name} vs ${match.awayTeam?.name} (${match.id})`);
            skipped++;
          }
        } else {
          // Insert new match
          const { _id, ...matchWithoutId } = match; // Remove MongoDB _id to let it generate new one
          await matchesCollectionESPN.insertOne(matchWithoutId);
          console.log(`  ➕ Inserted: ${match.homeTeam?.name} vs ${match.awayTeam?.name} (${match.id})`);
          inserted++;
        }
      } catch (error) {
        console.error(`  ❌ Error syncing match ${match.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n✅ Sync complete!');
    console.log(`  ➕ Inserted: ${inserted} matches`);
    console.log(`  ♻️  Updated: ${updated} matches`);
    console.log(`  ⏭️  Skipped: ${skipped} matches`);
    if (errors > 0) {
      console.log(`  ❌ Errors: ${errors} matches`);
    }
    
    // Verify counts
    const regularCount = await matchesCollection.countDocuments({ createdByAdmin: true });
    const espnCount = await matchesCollectionESPN.countDocuments({ createdByAdmin: true });
    console.log(`\n📊 Final counts:`);
    console.log(`  Match_Info: ${regularCount} admin matches`);
    console.log(`  Match_Info_ESPN: ${espnCount} admin matches`);
    
    if (regularCount === espnCount) {
      console.log('\n✅ Collections are now in sync!');
    } else {
      console.log('\n⚠️  Warning: Collection counts do not match');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the sync
syncAdminMatches();
