// Migration script to copy all admin-created matches to Match_Info_ADMIN collection
const { 
  getDatabase, 
  getMatchesCollection, 
  getMatchesCollectionESPN,
  getMatchesCollectionADMIN 
} = require('../lib/mongodb');

async function migrateAdminMatches() {
  console.log('Starting admin matches migration...\n');
  
  try {
    const db = await getDatabase();
    
    // Get all collections
    const matchesCollection = await getMatchesCollection();
    const matchesCollectionESPN = await getMatchesCollectionESPN();
    const matchesCollectionADMIN = await getMatchesCollectionADMIN();
    
    // Find all admin-created matches from Match_Info (regular collection)
    console.log('Searching Match_Info for admin-created matches...');
    const adminMatchesFromRegular = await matchesCollection
      .find({ 
        $or: [
          { createdByAdmin: true },
          { source: 'admin' }
        ]
      })
      .toArray();
    
    console.log(`Found ${adminMatchesFromRegular.length} admin matches in Match_Info`);
    
    // Find all admin-created matches from Match_Info_ESPN
    console.log('Searching Match_Info_ESPN for admin-created matches...');
    const adminMatchesFromESPN = await matchesCollectionESPN
      .find({ 
        $or: [
          { createdByAdmin: true },
          { source: 'admin' }
        ]
      })
      .toArray();
    
    console.log(`Found ${adminMatchesFromESPN.length} admin matches in Match_Info_ESPN`);
    
    // Combine both sources, using a Map to deduplicate by match id
    const allAdminMatches = new Map();
    
    for (const match of adminMatchesFromRegular) {
      const matchId = match.id || match._id?.toString();
      if (matchId) {
        allAdminMatches.set(matchId, match);
      }
    }
    
    for (const match of adminMatchesFromESPN) {
      const matchId = match.id || match._id?.toString();
      if (matchId && !allAdminMatches.has(matchId)) {
        allAdminMatches.set(matchId, match);
      }
    }
    
    console.log(`\nTotal unique admin matches to migrate: ${allAdminMatches.size}`);
    
    if (allAdminMatches.size === 0) {
      console.log('No admin matches found to migrate.');
      process.exit(0);
    }
    
    // Check what's already in Match_Info_ADMIN
    const existingInAdmin = await matchesCollectionADMIN.find({}).toArray();
    console.log(`Existing matches in Match_Info_ADMIN: ${existingInAdmin.length}`);
    
    // Prepare for migration
    let insertedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    
    console.log('\nMigrating matches...');
    
    for (const [matchId, match] of allAdminMatches) {
      try {
        // Remove MongoDB _id to avoid duplicate key errors
        const matchCopy = { ...match };
        delete matchCopy._id;
        
        // Ensure the match has the required admin flags
        matchCopy.createdByAdmin = true;
        matchCopy.source = 'admin';
        
        // Check if match already exists in ADMIN collection
        const existing = await matchesCollectionADMIN.findOne({ 
          $or: [
            { id: matchId },
            { id: match.id }
          ]
        });
        
        if (existing) {
          // Update existing match
          await matchesCollectionADMIN.updateOne(
            { _id: existing._id },
            { $set: matchCopy }
          );
          updatedCount++;
          console.log(`  ✓ Updated: ${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam} (${matchId})`);
        } else {
          // Insert new match
          await matchesCollectionADMIN.insertOne(matchCopy);
          insertedCount++;
          console.log(`  + Inserted: ${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam} (${matchId})`);
        }
        
        // Also ensure it exists in ESPN collection
        const existingInESPN = await matchesCollectionESPN.findOne({ 
          $or: [
            { id: matchId },
            { id: match.id }
          ]
        });
        
        if (!existingInESPN) {
          await matchesCollectionESPN.insertOne({ ...matchCopy });
          console.log(`    → Also added to Match_Info_ESPN`);
        }
        
      } catch (error) {
        console.error(`  ✗ Error migrating match ${matchId}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total admin matches found: ${allAdminMatches.size}`);
    console.log(`Inserted to Match_Info_ADMIN: ${insertedCount}`);
    console.log(`Updated in Match_Info_ADMIN: ${updatedCount}`);
    console.log(`Skipped (errors): ${skippedCount}`);
    console.log('='.repeat(60));
    
    // Verify final counts
    const finalCountADMIN = await matchesCollectionADMIN.countDocuments({});
    const finalCountESPN = await matchesCollectionESPN.countDocuments({ 
      $or: [
        { createdByAdmin: true },
        { source: 'admin' }
      ]
    });
    
    console.log('\nFinal collection counts:');
    console.log(`Match_Info_ADMIN: ${finalCountADMIN} total matches`);
    console.log(`Match_Info_ESPN: ${finalCountESPN} admin matches`);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateAdminMatches();
