#!/usr/bin/env node

/**
 * Migration script to transition from Firebase to MongoDB
 * This script helps set up the MongoDB collections and initial data
 */

// Load environment variables
require('dotenv').config();

const { connectToDatabase, getMatchesCollection, getTeamsCollection, getUsersCollection } = require('../lib/mongodb');

async function createIndexes() {
  console.log('Creating database indexes...');
  
  try {
    // Create indexes for better performance
    const matchesCollection = await getMatchesCollection();
    const teamsCollection = await getTeamsCollection();
    const usersCollection = await getUsersCollection();

    // Matches indexes
    await matchesCollection.createIndex({ id: 1 }, { unique: true });
    await matchesCollection.createIndex({ homeTeam: 1 });
    await matchesCollection.createIndex({ awayTeam: 1 });
    await matchesCollection.createIndex({ status: 1 });
    await matchesCollection.createIndex({ competition: 1 });
    await matchesCollection.createIndex({ utcDate: 1 });

    // Teams indexes
    await teamsCollection.createIndex({ name: 1 }, { unique: true });

    // Users indexes
    await usersCollection.createIndex({ userId: 1 }, { unique: true });

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
}

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    const { db } = await connectToDatabase();
    
    // Test write operation
    const testCollection = db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'MongoDB connection successful'
    });
    
    // Test read operation
    const testDoc = await testCollection.findOne({ test: true });
    console.log('✅ MongoDB connection test successful:', testDoc.message);
    
    // Clean up test collection
    await testCollection.drop();
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error.message);
    return false;
  }
}

async function seedSampleData() {
  console.log('Seeding sample data...');
  
  try {
    const matchesCollection = await getMatchesCollection();
    const teamsCollection = await getTeamsCollection();

    // Sample teams
    const sampleTeams = [
      'Manchester United',
      'Liverpool',
      'Chelsea',
      'Arsenal',
      'Manchester City',
      'Tottenham',
      'Barcelona',
      'Real Madrid'
    ];

    // Insert sample teams
    const teamOperations = sampleTeams.map(teamName => ({
      updateOne: {
        filter: { name: teamName },
        update: { 
          $set: {
            name: teamName,
            lastUpdated: new Date().toISOString()
          }
        },
        upsert: true
      }
    }));

    await teamsCollection.bulkWrite(teamOperations);

    // Sample matches
    const sampleMatches = [
      {
        id: 'sample-1',
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        homeScore: 2,
        awayScore: 1,
        status: 'final',
        sport: 'Football',
        competition: 'Premier League',
        venue: 'Old Trafford',
        utcDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'sample-2',
        homeTeam: 'Chelsea',
        awayTeam: 'Arsenal',
        homeScore: 'TBA',
        awayScore: 'TBA',
        status: 'scheduled',
        sport: 'Football',
        competition: 'Premier League',
        venue: 'Stamford Bridge',
        utcDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        lastUpdated: new Date().toISOString()
      }
    ];

    // Insert sample matches
    const matchOperations = sampleMatches.map(match => ({
      updateOne: {
        filter: { id: match.id },
        update: { 
          $set: match
        },
        upsert: true
      }
    }));

    await matchesCollection.bulkWrite(matchOperations);

    console.log(`✅ Seeded ${sampleTeams.length} teams and ${sampleMatches.length} matches`);
  } catch (error) {
    console.error('❌ Error seeding sample data:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting MongoDB migration setup...\n');

  // Test connection first
  const connectionSuccessful = await testConnection();
  if (!connectionSuccessful) {
    console.error('Cannot proceed without a valid MongoDB connection. Please check your MONGODB_URI in .env');
    process.exit(1);
  }

  // Create indexes
  await createIndexes();

  // Seed sample data
  await seedSampleData();

  console.log('\n✅ Migration setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update your .env file with the correct MONGODB_URI');
  console.log('2. Remove Firebase configuration from your .env');
  console.log('3. Run: npm start');
  console.log('4. Test the application with the new MongoDB backend');
  
  process.exit(0);
}

// Run the migration if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testConnection,
  createIndexes,
  seedSampleData
};
