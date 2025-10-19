// Server uptime API endpoint
let serverStartTime = Date.now();

async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const currentTime = Date.now();
    const uptimeMs = currentTime - serverStartTime;
    
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
    
    let formattedUptime;
    if (hours > 0) {
      formattedUptime = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      formattedUptime = `${minutes}m ${seconds}s`;
    } else {
      formattedUptime = `${seconds}s`;
    }

    res.status(200).json({
      serverStartTime: new Date(serverStartTime).toISOString(),
      currentServerTime: new Date(currentTime).toISOString(),
      uptimeMs,
      uptimeFormatted: formattedUptime,
      status: 'online'
    });
  } catch (error) {
    console.error('Server uptime API error:', error);
    res.status(500).json({ 
      error: 'Failed to get server uptime',
      message: error.message
    });
  }
}

module.exports = handler;
