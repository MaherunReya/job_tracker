const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query } = require('../db');
const { wrap, signToken, newToken, hashToken } = require('../utils');
const { requireAuth } = require('../middleware');
const { sendVerificationEmail } = require('../mailer');

const router = express.Router();

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // links work for 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000;      // at most one email per minute per account

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const verifySchema = z.object({ token: z.string().min(20).max(200) });
const resendSchema = z.object({ email: z.string().email().toLowerCase() });

// The token lives in the URL fragment (#/verify?token=...), so it is never sent to a server
// or written to access logs, and email link scanners that only fetch the page don't use it up.
function verifyLink(token) {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  return `${base}/#/verify?token=${token}`;
}

// Creates a fresh single-use token (replacing any older one) and emails it. Returns true if sent.
async function issueVerification(user) {
  const token = newToken();
  await query(
    `UPDATE users SET verification_token_hash = $1, verification_expires_at = $2, verification_sent_at = now()
     WHERE id = $3`,
    [hashToken(token), new Date(Date.now() + VERIFY_TTL_MS), user.id]
  );
  try {
    await sendVerificationEmail(user.email, user.name, verifyLink(token));
    return true;
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
    return false;
  }
}

router.post('/register', wrap(async (req, res) => {
  const { email, password, name } = registerSchema.parse(req.body);

  const exists = await query('SELECT email_verified_at FROM users WHERE email = $1', [email]);
  if (exists.rowCount) {
    if (!exists.rows[0].email_verified_at) {
      return res.status(409).json({
        error: 'This email is registered but not verified yet. Check your inbox or resend the link.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email, name || null, hash]
  );
  const emailSent = await issueVerification(rows[0]);

  // No token yet: the account can't be used until the email is verified.
  res.status(201).json({ message: 'Check your email to verify your account', email, emailSent });
}));

router.post('/verify-email', wrap(async (req, res) => {
  const { token } = verifySchema.parse(req.body);
  const { rows } = await query(
    `SELECT id, email, name FROM users
     WHERE verification_token_hash = $1 AND verification_expires_at > now()`,
    [hashToken(token)]
  );
  const user = rows[0];
  if (!user) return res.status(400).json({ error: 'This verification link is invalid or has expired' });

  // Single use: clear the token as soon as it works.
  await query(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()),
       verification_token_hash = NULL, verification_expires_at = NULL
     WHERE id = $1`,
    [user.id]
  );
  res.json({ token: signToken(user.id), user });
}));

// Always answers the same way, so it can't be used to discover which emails have accounts.
router.post('/resend-verification', wrap(async (req, res) => {
  const { email } = resendSchema.parse(req.body);
  const { rows } = await query(
    'SELECT id, email, name, email_verified_at, verification_sent_at FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  const cooledDown = user && (!user.verification_sent_at || Date.now() - new Date(user.verification_sent_at).getTime() > RESEND_COOLDOWN_MS);
  if (user && !user.email_verified_at && cooledDown) await issueVerification(user);

  res.json({ message: 'If an account exists for that email and is not verified yet, we have sent a new link.' });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  // Only reveal this after the password is right, so it can't be used to probe for accounts.
  if (!user.email_verified_at) {
    return res.status(403).json({ error: 'Please verify your email before logging in', code: 'EMAIL_NOT_VERIFIED' });
  }
  res.json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const { rows } = await query('SELECT id, email, name FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}));

module.exports = router;