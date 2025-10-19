#!/usr/bin/env node
/**
 * Clears all documents from the Event_Log collection.
 * Usage: node scripts/clearEventLog.js [--yes]
 */
const { connectToDatabase, getDatabase } = require('../lib/mongodb');

(async () => {
  try {
    await connectToDatabase();
    const db = await getDatabase();
    const col = db.collection('Event_Log');
    const count = await col.countDocuments();
    if (!process.argv.includes('--yes')) {
      console.log(`About to delete ${count} documents from Event_Log. Re-run with --yes to confirm.`);
      process.exit(0);
    }
    const res = await col.deleteMany({});
    console.log(`Deleted ${res.deletedCount} documents from Event_Log.`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to clear Event_Log:', e);
    process.exit(1);
  }
})();
