const app = require('./src/app');
const { PORT } = require('./src/config');
const { ensureDatabase } = require('./src/lib/db');

async function start() {
  await ensureDatabase();
  app.listen(PORT, () => {
    console.log(`SCIS News & Events server running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start SCIS News & Events server.');
  console.error(error);
  process.exit(1);
});
