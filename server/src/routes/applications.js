const express = require('express');
const { z } = require('zod');
const { query } = require('../db');
const { wrap } = require('../utils');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

const createSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  status: z.enum(STATUSES).default('wishlist'),
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'URL must start with http:// or https://').optional().nullable(),
  notes: z.string().optional().nullable(),
  applied_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
const updateSchema = createSchema.partial();

// Reject non-numeric ids with 400 instead of letting Postgres throw a 500.
router.param('id', (req, res, next, id) => {
  if (!/^[1-9]\d{0,8}$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
  next();
});

// GET /api/applications?status=applied&q=google
router.get('/', wrap(async (req, res) => {
  const params = [req.userId];
  let sql = 'SELECT * FROM applications WHERE user_id = $1';
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) return res.status(400).json({ error: 'Invalid status' });
    params.push(req.query.status);
    sql += ` AND status = $${params.length}`;
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    // escape LIKE wildcards so "100%" or "_" are searched literally
    const term = req.query.q.trim().slice(0, 100).replace(/[\\%_]/g, '\\$&');
    params.push(`%${term}%`);
    sql += ` AND (company ILIKE $${params.length} OR role ILIKE $${params.length})`;
  }
  sql += ' ORDER BY updated_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  const d = createSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO applications (user_id, company, role, status, url, notes, applied_date, follow_up_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.userId, d.company, d.role, d.status, d.url ?? null, d.notes ?? null, d.applied_date ?? null, d.follow_up_date ?? null]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/:id', wrap(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const keys = Object.keys(data);
  if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });

  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => data[k]);
  values.push(req.params.id, req.userId);

  const { rows } = await query(
    `UPDATE applications SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM applications WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}));

module.exports = router;