require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const LOCK_ID = 727274; // arbitrary constant; stops two instances migrating at the same moment

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(sql); // schema.sql is idempotent (IF NOT EXISTS)
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => { console.log('Migration complete'); return pool.end(); })
    .catch((err) => { console.error(err); process.exit(1); });
}
