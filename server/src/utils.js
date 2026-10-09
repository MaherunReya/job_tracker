const jwt = require('jsonwebtoken');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function jwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
}

const signToken = (userId) => jwt.sign({ id: userId }, jwtSecret(), { expiresIn: '7d' });

module.exports = { wrap, jwtSecret, signToken };
