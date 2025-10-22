const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

let client;
let db;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'sports_live';

console.log('MongoDB URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Log URI with masked password

async function connectToDatabase() {
  if (db) {
    return { client, db };
  }

  try {
    client = new MongoClient(MONGODB_URI);

    await client.connect();
    console.log('Connected to MongoDB');
    
    db = client.db(DATABASE_NAME);
    
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function getDatabase() {
  if (!db) {
    await connectToDatabase();
  }
  return db;
}

// Collections - Updated to match your actual MongoDB schema
const getMatchesCollection = async () => {
  const database = await getDatabase();
  return database.collection('Match_Info'); // Using your actual collection name
};

// ESPN-specific collections (read-through cache for ESPN data)
const getMatchesCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Info_ESPN');
};

const getMatchesCollectionADMIN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Info_ADMIN');
};

const getAdminMatchesCollection = async () =>{
  const database =  await getDatabase()
  return database.collection('AdminMatches');
}

const getTeamsCollection = async () => {
  const database = await getDatabase();
  return database.collection('Teams'); // Using your actual collection name
};

const getTeamsCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Teams_ESPN');
};

const getUsersCollection = async () => {
  const database = await getDatabase();
  return database.collection('Users'); // Using your actual collection name
};

const getUserPreferencesCollection = async () => {
  const database = await getDatabase();
  return database.collection('user_preferences');
};

// New collections according to your schema
const getDisplayStateCollection = async () => {
  const database = await getDatabase();
  return database.collection('Display_State');
};

const getEventLogCollection = async () => {
  const database = await getDatabase();
  return database.collection('Event_Log');
};

const getFavoriteTeamsCollection = async () => {
  const database = await getDatabase();
  return database.collection('Favorite_Teams');
};

const getMatchInfoCollection = async () => {
  const database = await getDatabase();
  return database.collection('Match_Info');
};

const getPlayersCollection = async () => {
  const database = await getDatabase();
  return database.collection('Players');
};

const getPlayersCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Players_ESPN');
};

const getTeamsInfoCollection = async () => {
  const database = await getDatabase();
  return database.collection('Teams');
};

const getUsersInfoCollection = async () => {
  const database = await getDatabase();
  return database.collection('Users');
};

// User watchlist: matches users add to watchlist
const getUserMatchesCollection = async () => {
  const database = await getDatabase();
  return database.collection('user_matches');
};


const getStandingsCollection = async () => {
  const database = await getDatabase();
  return database.collection('LeagueStandings');
};
 const getReportsCollection = async () => {
  const database = await getDatabase();
  return database.collection('Reports');
}

 const getFootballNewsCollection = async () => {
  const database = await getDatabase();
  return database.collection('Football_News');
}

const getFootballHighlightsCollection  = async () => {
  const database = await getDatabase();
  return database.collection('Football_Highlights');
}
const getMatchLineupsCollection = async () => {
  const database = await getDatabase();
  return database.collection('Match_Lineups');
}

const getMatchLineupsCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Lineups_ESPN');
}

const getMatchLineupsCollectionADMIN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Lineups_ADMIN');
}


 const getMatchCommentaryCollection = async () => {
  const database = await getDatabase();
  return database.collection('Match_Commentary');
}

const getMatchCommentaryCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Commentary_ESPN');
}

const getMatchCommentaryCollectionADMIN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Commentary_ADMIN');
}

const getMatchStatisticsCollectionADMIN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Statistics_ADMIN');
}

const getMatchStatisticsCollectionESPN = async () => {
  const database = await getDatabase();
  return database.collection('Match_Statistics_ESPN');
}




module.exports = {
  connectToDatabase,
  getDatabase,
  getMatchesCollection,
  getMatchesCollectionESPN,
  getMatchesCollectionADMIN,
  getAdminMatchesCollection,
  getTeamsCollection,
  getTeamsCollectionESPN,
  getUsersCollection,
  getUserPreferencesCollection,
  // New collections
  getDisplayStateCollection,
  getEventLogCollection,
  getFavoriteTeamsCollection,
  getMatchInfoCollection,
  getPlayersCollection,
  getPlayersCollectionESPN,
  getTeamsInfoCollection,
  getUsersInfoCollection,
  getUserMatchesCollection,
  getStandingsCollection,
  getReportsCollection,
  getFootballHighlightsCollection,
  getFootballNewsCollection,
  getMatchLineupsCollection,
  getMatchLineupsCollectionESPN,
  getMatchLineupsCollectionADMIN,
  getMatchCommentaryCollection,
  getMatchCommentaryCollectionESPN,
  getMatchCommentaryCollectionADMIN,
  getMatchStatisticsCollectionADMIN,
  getMatchStatisticsCollectionESPN
};
