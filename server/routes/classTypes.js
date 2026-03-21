import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const CT_BASE = 'SELECT * FROM "ClassType"';

router.get('/', async (req, res) => {
  try {
    const paginated = await paginatedQuery(pool, CT_BASE, [], {
      searchColumns: ['ClassType'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${CT_BASE} ORDER BY "id"`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "ClassType" WHERE "id" = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Class type not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ClassType: name, currentActiveSession } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO "ClassType" ("ClassType", "currentActiveSession") VALUES ($1, COALESCE($2, 1)) RETURNING *',
      [name ?? '', currentActiveSession ?? 1]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { ClassType: name, currentActiveSession } = req.body;
    const { rows } = await pool.query(
      'UPDATE "ClassType" SET "ClassType" = COALESCE($2, "ClassType"), "currentActiveSession" = COALESCE($3, "currentActiveSession") WHERE "id" = $1 RETURNING *',
      [req.params.id, name, currentActiveSession]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class type not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM "ClassType" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Class type not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
