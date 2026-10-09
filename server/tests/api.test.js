const request = require('supertest');
const app = require('../src/app');
const migrate = require('../src/migrate');
const { pool } = require('../src/db');

const user = { email: 'test@example.com', password: 'password123', name: 'Test' };
let token;

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
  test('registers a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
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
    const other = await request(app).post('/api/auth/register').send({ email: 'other@example.com', password: 'password123' });
    const res = await request(app)
      .delete(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${other.body.token}`);
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