// Runs before every test file (see "jest" in package.json).
const path = require('path');

process.env.NODE_ENV = 'test';
// dotenv never overrides variables that are already set (e.g. in CI or your shell).
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Safety guard: the tests TRUNCATE tables, so refuse to run against anything that isn't a test DB.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set. Copy server/.env.test.example to server/.env.test (see README).');
}
const dbName = new URL(url).pathname.replace(/^\//, '');
if (!/test/i.test(dbName)) {
  throw new Error(`Refusing to run tests against "${dbName}": database name must contain "test" because tests wipe all data.`);
}
