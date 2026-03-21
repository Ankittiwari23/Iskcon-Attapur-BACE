import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const MT_BASE = 'SELECT * FROM "MemberType"';

router.get('/', async (req, res) => {
  try {
    const paginated = await paginatedQuery(pool, MT_BASE, [], {
      searchColumns: ['MemberTypeName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const result = await pool.query(`${MT_BASE} ORDER BY "id"`);
    res.json(result.rows || []);
  } catch (e) {
    if (e?.code === '42P01') {
      try {
        const result = await pool.query('SELECT * FROM membertype ORDER BY id');
        return res.json(result.rows || []);
      } catch (_) {}
    }
    const msg = e?.message || e?.detail || (e?.code && `code: ${e.code}`) || String(e) || 'Unknown error';
    console.error('memberTypes GET /', e);
    res.status(500).json({ error: msg });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "MemberType" WHERE "id" = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Member type not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('memberTypes GET /:id', e);
    res.status(500).json({ error: e?.message || String(e) || 'Unknown error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { MemberTypeName } = req.body;
    const { rows } = await pool.query('INSERT INTO "MemberType" ("MemberTypeName") VALUES ($1) RETURNING *', [MemberTypeName ?? '']);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) || 'Unknown error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { MemberTypeName } = req.body;
    const { rows } = await pool.query('UPDATE "MemberType" SET "MemberTypeName" = COALESCE($2, "MemberTypeName") WHERE "id" = $1 RETURNING *', [req.params.id, MemberTypeName]);
    if (rows.length === 0) return res.status(404).json({ error: 'Member type not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) || 'Unknown error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM "MemberType" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Member type not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) || 'Unknown error' });
  }
});

export default router;
