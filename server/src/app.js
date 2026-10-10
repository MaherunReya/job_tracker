const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { query } = require('./db');

const app = express();

// Behind Render/Railway/nginx the real client IP is in X-Forwarded-For.
// Needed so rate limiting counts per user instead of per proxy.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '0');
app.set('trust proxy', Number(trustProxy));

app.use(helmet());

// CLIENT_URL can be one origin or a comma-separated list.
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));

const limiterOptions = { standardHeaders: 'draft-7', legacyHeaders: false };

// Strict limit on login/register to slow down brute-force attempts.
const authLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  message: { error: 'Too many attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Verification links are 256-bit random tokens, so guessing is hopeless; this just stops floods.
app.use('/api/auth/verify-email', rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.VERIFY_RATE_LIMIT_MAX) || 30,
  message: { error: 'Too many attempts, please try again later' },
}));

// Every resend sends a real email, so keep this tight.
app.use('/api/auth/resend-verification', rateLimit({
  ...limiterOptions,
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.RESEND_RATE_LIMIT_MAX) || 5,
  message: { error: 'Too many emails requested, please try again later' },
}));

// Generous limit for everything else.
app.use('/api', rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT_MAX) || 600,
  message: { error: 'Too many requests, please slow down' },
}));

// Health check that actually touches the database.
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ ok: false, db: 'down' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.issues[0]?.message || 'Invalid input', details: err.issues });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;