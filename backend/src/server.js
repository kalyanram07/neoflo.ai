// server.js - Backend Ingestion Server Entry Point with Pruning Cron

const createApp = require('./app');
const DatabaseManager = require('./db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  const dbManager = new DatabaseManager();
  await dbManager.init();

  const app = createApp(dbManager);

  // Feature 7: Hourly Database Data Pruning Cron Job
  const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // Every 1 hour
  setInterval(() => {
    dbManager.pruneOldData(500).then(() => {
      console.log('[Visual AI Backend] Hourly database pruning executed successfully.');
    });
  }, PRUNE_INTERVAL_MS);

  const server = app.listen(PORT, () => {
    console.log(`[Visual AI Backend v2] Listening on http://localhost:${PORT}`);
    console.log(`[Visual AI Backend v2] Live Dashboard available at http://localhost:${PORT}/dashboard`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start Visual AI Backend:', err);
    process.exit(1);
  });
}

module.exports = startServer;
