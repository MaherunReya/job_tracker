process.env.AUTH_RATE_LIMIT_MAX = '3'; // set before the app is loaded

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');
const { validateEnv } = require('../src/env');

afterAll(async () => {
  await pool.end();
});

describe('rate limiting', () => {
  test('blocks repeated login/register attempts with 429', async () => {
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({});
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 3)).toEqual([400, 400, 400]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });
});

describe('security headers', () => {
  test('sets helmet headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('validateEnv', () => {
  const ok = {
    DATABASE_URL: 'postgres://x',
    JWT_SECRET: 'a'.repeat(40),
    NODE_ENV: 'production',
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    EMAIL_FROM: 'Job Tracker <me@example.com>',
    CLIENT_URL: 'https://app.example.com',
  };

  test('accepts a valid production config', () => {
    expect(() => validateEnv(ok)).not.toThrow();
  });
  test('requires DATABASE_URL and JWT_SECRET', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL.*\n.*JWT_SECRET/);
  });
  test('rejects short or placeholder secrets in production', () => {
    expect(() => validateEnv({ ...ok, JWT_SECRET: 'short' })).toThrow(/32 characters/);
    expect(() => validateEnv({ ...ok, JWT_SECRET: 'change-me-in-production-please-0000000' })).toThrow(/placeholder/);
  });
  test('requires email settings in production', () => {
    const { SMTP_HOST, EMAIL_FROM, ...rest } = ok;
    expect(() => validateEnv(rest)).toThrow(/SMTP_HOST is required in production/);
    expect(() => validateEnv(rest)).toThrow(/EMAIL_FROM is required in production/);
  });
  test('does not require email settings in development', () => {
    expect(() => validateEnv({ DATABASE_URL: 'postgres://x', JWT_SECRET: 'dev', NODE_ENV: 'development' })).not.toThrow();
  });
  test('allows a short secret outside production', () => {
    expect(() => validateEnv({ ...ok, NODE_ENV: 'development', JWT_SECRET: 'dev' })).not.toThrow();
  });
});