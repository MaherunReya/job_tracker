const { Pool, types } = require('pg');

// Return DATE columns as 'YYYY-MM-DD' strings. Without this, node-pg turns them into JS Dates
// and timezones (e.g. Dhaka, UTC+6) can shift the day by one.
types.setTypeParser(1082, (v) => v);

// Neon and most managed Postgres providers need SSL. Their connection strings usually carry
// ?sslmode=require already; set DATABASE_SSL=true only if yours does not.
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

module.exports = { pool, query: (text, params) => pool.query(text, params) };