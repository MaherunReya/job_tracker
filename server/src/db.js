const { Pool, types } = require('pg');

// Return DATE columns as 'YYYY-MM-DD' strings. Without this, node-pg turns them into JS Dates
// and timezones (e.g. Dhaka, UTC+6) can shift the day by one.
types.setTypeParser(1082, (v) => v);

// Neon and most managed Postgres providers need SSL. Their connection strings usually carry
// ?sslmode=require already; set DATABASE_SSL=true only if yours does not.
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

// Managed databases (Neon, Render) close idle connections. Without this listener, Node treats
// that as an unhandled 'error' event and the whole API process crashes. The pool simply
// opens a new connection on the next query.
pool.on('error', (err) => {
  console.error('Idle database client error (the pool will reconnect):', err.message);
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };