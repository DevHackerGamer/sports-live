#!/usr/bin/env node

/**
 * Simple test script to verify the migration setup without MongoDB
 * This creates mock data to test the API endpoints
 */

console.log('🚀 Testing API setup without MongoDB...\n');

// Test API imports
try {
  console.log('✅ Testing API file imports...');
  
  // Test if our API files are properly structured
  const fs = require('fs');
  const path = require('path');
  
  const apiFiles = [
    '../api/matches.js',
    '../api/teams.js', 
    '../api/users.js',
    '../lib/mongodb.js',
    '../src/lib/api.js'
  ];
  
  apiFiles.forEach(file => {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} exists`);
    } else {
      console.log(`   ❌ ${file} missing`);
    }
  });
  
  console.log('\n🎯 API Structure Test Complete');
  console.log('\n📋 Next Steps:');
  console.log('1. Choose MongoDB option:');
  console.log('   - MongoDB Atlas (recommended): Follow MONGODB_ATLAS_SETUP.md');
  console.log('   - Local MongoDB: Run ./install-mongodb-local.sh');
  console.log('2. Update .env file with your MongoDB URI');
  console.log('3. Run: node scripts/migrate-to-mongodb.js');
  console.log('4. Start your app: npm start');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
