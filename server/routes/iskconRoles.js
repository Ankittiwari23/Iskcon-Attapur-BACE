import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "IskconRoles" ORDER BY "id"');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "IskconRoles" WHERE "id" = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Iskcon role not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { Designation } = req.body;
    const { rows } = await pool.query('INSERT INTO "IskconRoles" ("Designation") VALUES ($1) RETURNING *', [Designation ?? '']);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { Designation } = req.body;
    const { rows } = await pool.query('UPDATE "IskconRoles" SET "Designation" = COALESCE($2, "Designation") WHERE "id" = $1 RETURNING *', [req.params.id, Designation]);
    if (rows.length === 0) return res.status(404).json({ error: 'Iskcon role not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM "IskconRoles" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Iskcon role not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
