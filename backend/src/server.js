// server.js - Backend Ingestion Server Entry Point

const createApp = require('./app');
const DatabaseManager = require('./db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  const dbManager = new DatabaseManager();
  await dbManager.init();

  const app = createApp(dbManager);

  app.listen(PORT, () => {
    console.log(`[Visual AI Backend] Ingestion server listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start Visual AI Backend:', err);
    process.exit(1);
  });
}

module.exports = startServer;
