require('dotenv').config();
const { validateEnv } = require('./env');

validateEnv(); // crash immediately if config is missing or unsafe

const app = require('./app');
const migrate = require('./migrate');
const { pool } = require('./db');

const port = process.env.PORT || 4000;

async function main() {
  await migrate(); // make sure tables exist on every deploy
  console.log('Database schema is up to date');

  const server = app.listen(port, () => console.log(`API running on port ${port}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
