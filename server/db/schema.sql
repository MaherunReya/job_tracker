CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company      TEXT NOT NULL,
  role         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'wishlist'
               CHECK (status IN ('wishlist','applied','interview','offer','rejected')),
  url          TEXT,
  notes        TEXT,
  applied_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

-- Added after the first release; IF NOT EXISTS keeps this safe on existing databases.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Email verification. Existing accounts are marked verified once, when the column is first added,
-- so nobody who registered before this feature gets locked out.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
    UPDATE users SET email_verified_at = now();
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token_hash);