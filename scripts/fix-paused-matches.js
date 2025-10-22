const { getDatabase } = require('../lib/mongodb');

(async () => {
  try {
    const db = await getDatabase();
    const matchesADMIN = db.collection('Match_Info_ADMIN');
    const matchesESPN = db.collection('Match_Info_ESPN');
    
    // Find matches that are PAUSED and have a Full Time event
    const filter = { status: 'PAUSED' };
    
    const pausedAdmin = await matchesADMIN.find(filter).toArray();
    const pausedESPN = await matchesESPN.find(filter).toArray();
    
    console.log(`Found ${pausedAdmin.length} PAUSED matches in ADMIN collection`);
    console.log(`Found ${pausedESPN.length} PAUSED matches in ESPN collection`);
    
    let fixedCount = 0;
    
    for (const match of pausedAdmin) {
      const hasFullTime = (match.events || []).some(e => 
        e.type === 'match_end' || e.type === 'matchend' || e.description === 'Full Time'
      );
      
      if (hasFullTime) {
        console.log(`Fixing ADMIN match: ${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam}`);
        await matchesADMIN.updateOne(
          { _id: match._id },
          { $set: { status: 'FINISHED', lastUpdated: new Date().toISOString() } }
        );
        fixedCount++;
      }
    }
    
    for (const match of pausedESPN) {
      const hasFullTime = (match.events || []).some(e => 
        e.type === 'match_end' || e.type === 'matchend' || e.description === 'Full Time'
      );
      
      if (hasFullTime) {
        console.log(`Fixing ESPN match: ${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam}`);
        await matchesESPN.updateOne(
          { _id: match._id },
          { $set: { status: 'FINISHED', lastUpdated: new Date().toISOString() } }
        );
        fixedCount++;
      }
    }
    
    console.log(`\nFixed ${fixedCount} matches!`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
