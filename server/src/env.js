// Fail fast: crash at startup with a clear message instead of failing on the first request.
function validateEnv(env = process.env) {
  const errors = [];

  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');

  const secret = env.JWT_SECRET;
  if (!secret) {
    errors.push('JWT_SECRET is required');
  } else if (env.NODE_ENV === 'production') {
    if (secret.length < 32) errors.push('JWT_SECRET must be at least 32 characters in production');
    if (/change-me/i.test(secret)) errors.push('JWT_SECRET must not be a placeholder value in production');
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  }
}

module.exports = { validateEnv };
