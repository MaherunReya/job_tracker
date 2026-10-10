process.env.AUTH_RATE_LIMIT_MAX = '100'; // these tests sign up many users; set before the app loads

const request = require('supertest');
const app = require('../src/app');
const migrate = require('../src/migrate');
const { pool } = require('../src/db');
const { outbox } = require('../src/mailer');

const user = { email: 'test@example.com', password: 'password123', name: 'Test' };
let token;

// The verification link normally arrives by email; in tests it lands in the in-memory outbox.
const linkTokenFor = (email) => {
  const mail = [...outbox].reverse().find((m) => m.to === email);
  return mail ? mail.link.split('token=')[1] : null;
};

async function registerVerified(email, password = 'password123', name) {
  await request(app).post('/api/auth/register').send({ email, password, name });
  const res = await request(app).post('/api/auth/verify-email').send({ token: linkTokenFor(email) });
  return res.body; // { token, user }
}

beforeAll(async () => {
  await migrate();
  await pool.query('TRUNCATE users, applications RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('health', () => {
  test('reports database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: 'up' });
  });
});

describe('auth', () => {
  test('registers a user without logging them in', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.body.emailSent).toBe(true);
    expect(linkTokenFor(user.email)).toBeTruthy();
  });

  test('cannot log in before verifying the email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('verifies the email and returns a token', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({ token: linkTokenFor(user.email) });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
  });

  test('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('logs in with correct password only', async () => {
    const ok = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrongpass1' });
    expect(bad.status).toBe(401);
  });
});

describe('applications', () => {
  let id;

  test('requires auth', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });

  test('creates an application', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Acme', role: 'Junior Developer' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('wishlist');
    id = res.body.id;
  });

  test('lists and filters applications', async () => {
    const res = await request(app)
      .get('/api/applications?q=acme')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('updates status', async () => {
    const res = await request(app)
      .patch(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'applied' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('applied');
  });

  test('saves and clears a follow-up date', async () => {
    const set = await request(app)
      .patch(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ follow_up_date: '2026-11-01' });
    expect(set.status).toBe(200);
    expect(set.body.follow_up_date).toBe('2026-11-01');

    const bad = await request(app)
      .patch(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ follow_up_date: 'tomorrow' });
    expect(bad.status).toBe(400);

    const cleared = await request(app)
      .patch(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ follow_up_date: null });
    expect(cleared.body.follow_up_date).toBeNull();
  });

  test('rejects invalid status', async () => {
    const res = await request(app)
      .patch(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'nope' });
    expect(res.status).toBe(400);
  });

  test("cannot touch another user's application", async () => {
    const other = await registerVerified('other@example.com');
    const res = await request(app)
      .delete(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(res.status).toBe(404);
  });

  test('rejects a non-numeric id with 400, not 500', async () => {
    const res = await request(app)
      .patch('/api/applications/abc')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'applied' });
    expect(res.status).toBe(400);
  });

  test('treats % and _ in search literally', async () => {
    const res = await request(app)
      .get('/api/applications?q=%25')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('deletes an application', async () => {
    const res = await request(app)
      .delete(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});

describe('email verification', () => {
  const email = 'verify-me@example.com';

  test('stores only a hash of the token', async () => {
    await request(app).post('/api/auth/register').send({ email, password: 'password123' });
    const raw = linkTokenFor(email);
    const { rows } = await pool.query('SELECT verification_token_hash FROM users WHERE email = $1', [email]);
    expect(rows[0].verification_token_hash).toBeTruthy();
    expect(rows[0].verification_token_hash).not.toBe(raw);
  });

  test('registering again while unverified points to resend', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('resend is rate limited per account, then sends a fresh link that replaces the old one', async () => {
    const oldToken = linkTokenFor(email);
    const before = outbox.length;

    // Too soon after signup: answers normally but sends nothing.
    const soon = await request(app).post('/api/auth/resend-verification').send({ email });
    expect(soon.status).toBe(200);
    expect(outbox.length).toBe(before);

    await pool.query("UPDATE users SET verification_sent_at = now() - interval '5 minutes' WHERE email = $1", [email]);
    const later = await request(app).post('/api/auth/resend-verification').send({ email });
    expect(later.status).toBe(200);
    expect(outbox.length).toBe(before + 1);

    const newToken = linkTokenFor(email);
    expect(newToken).not.toBe(oldToken);
    const stale = await request(app).post('/api/auth/verify-email').send({ token: oldToken });
    expect(stale.status).toBe(400);
  });

  test('resend gives the same answer for unknown emails and sends nothing', async () => {
    const before = outbox.length;
    const res = await request(app).post('/api/auth/resend-verification').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(outbox.length).toBe(before);
  });

  test('expired links are rejected', async () => {
    await pool.query("UPDATE users SET verification_expires_at = now() - interval '1 minute' WHERE email = $1", [email]);
    const res = await request(app).post('/api/auth/verify-email').send({ token: linkTokenFor(email) });
    expect(res.status).toBe(400);
  });

  test('garbage tokens are rejected', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({ token: 'x'.repeat(64) });
    expect(res.status).toBe(400);
  });

  test('a link works once, then logging in works', async () => {
    await pool.query("UPDATE users SET verification_sent_at = now() - interval '5 minutes' WHERE email = $1", [email]);
    await request(app).post('/api/auth/resend-verification').send({ email });
    const fresh = linkTokenFor(email);

    const first = await request(app).post('/api/auth/verify-email').send({ token: fresh });
    expect(first.status).toBe(200);
    const second = await request(app).post('/api/auth/verify-email').send({ token: fresh });
    expect(second.status).toBe(400);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(login.status).toBe(200);
  });

  test('resend does nothing for an already verified account', async () => {
    await pool.query("UPDATE users SET verification_sent_at = now() - interval '5 minutes' WHERE email = $1", [email]);
    const before = outbox.length;
    await request(app).post('/api/auth/resend-verification').send({ email });
    expect(outbox.length).toBe(before);
  });
});