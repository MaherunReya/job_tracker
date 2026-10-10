const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function jwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
}

const signToken = (userId) => jwt.sign({ id: userId }, jwtSecret(), { expiresIn: '7d' });

// Random token goes in the email link; only its SHA-256 hash is stored, so a leaked database
// cannot be used to verify accounts.
const newToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = { wrap, jwtSecret, signToken, newToken, hashToken };