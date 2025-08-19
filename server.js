// Production Express server: serves React build and exposes /api/* handlers.
// Why: Needed in a single container so Azure can run both the static app and API endpoints.

const express = require('express');
const cors = require('cors');
const path = require('path');
// Load env vars for local dev (Azure will use App Settings)
try {
  const fs = require('fs');
  const dotenv = require('dotenv');
  const envLocalPath = path.resolve(__dirname, '.env.local');
  const envPath = fs.existsSync(envLocalPath) ? envLocalPath : path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
} catch (_) {
  // dotenv not available in production or optional
}

const app = express();
app.use(cors());
app.use(express.json());

function delegate(moduleRelPath) {
  return (req, res) => {
    try {
      const absPath = path.resolve(__dirname, moduleRelPath);
      // Handlers are CommonJS modules exporting a function
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
app.all('/api/sports-data', delegate('./api/sports-data.js'));
app.all('/api/status', delegate('./api/status.js'));
app.all('/api/uptime', delegate('./api/uptime.js'));
app.all('/api/ingest-football', delegate('./api/ingest-football.js'));
app.all('/api/admin-health', delegate('./api/admin-health.js'));

// Serve static React build
const buildDir = path.join(__dirname, 'build');
app.use(express.static(buildDir));

// SPA fallback (keep after API routes) - Express v5 compatible
// Serve index.html for any non-API route
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

const PORT = process.env.PORT || 8080; // Azure listens on 8080 by default
app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
