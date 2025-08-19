const express = require('express');
const cors = require('cors');
const path = require('path');

try {
  const fs = require('fs');
  const dotenv = require('dotenv');
  const envLocalPath = path.resolve(__dirname, '.env.local');
  const envPath = fs.existsSync(envLocalPath) ? envLocalPath : path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
} catch (_) {}

const app = express();
app.use(cors());
app.use(express.json());

function delegate(moduleRelPath) {
  return (req, res) => {
    try {
      const absPath = path.resolve(__dirname, moduleRelPath);
      const handler = require(absPath);
      return handler(req, res);
    } catch (err) {
      console.error(`API route error for ${moduleRelPath}:`, err.message);
      res.status(500).json({ error: 'API handler error', message: err.message });
    }
  };
}

// API routes
app.all('/api/joke', delegate('./api/joke.js'));
app.all('/api/sports-data', (req, res) => {
  const { handler } = require('./api/sports-data');
  return handler(req, res);
});
app.all('/api/status', delegate('./api/status.js'));
app.all('/api/uptime', delegate('./api/uptime.js'));
app.all('/api/ingest-football', delegate('./api/ingest-football.js'));
app.all('/api/admin-health', delegate('./api/admin-health.js'));

// Serve static React build
const buildDir = path.join(__dirname, 'build');
app.use(express.static(buildDir));

// SPA fallback
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Auto populate/refresh matches highly depends on cache
const { fetchAndStoreMatches } = require('./api/sports-data');

async function refreshMatches() {
  try {
    console.log(`[${new Date().toISOString()}] Refreshing matches DB...`);
    const games = await fetchAndStoreMatches();
    console.log(`[${new Date().toISOString()}] Matches populated: ${games.length}`);
  } catch (err) {
    console.error('Error refreshing matches DB:', err);
  }
}

// Initial population on server start
refreshMatches();

// Refresh every 3 minutes (180000 ms)
setInterval(refreshMatches, 180000);

module.exports = app;
