import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const WR_BASE = 'SELECT * FROM "WebsiteRoles"';

router.get('/', async (req, res) => {
  try {
    const paginated = await paginatedQuery(pool, WR_BASE, [], {
      searchColumns: ['Name'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${WR_BASE} ORDER BY "id"`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "WebsiteRoles" WHERE "id" = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Website role not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { Name, viewAdmin, removeUser, addUser, markAttendance, assignTasks, updateSeva, addSeva } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO "WebsiteRoles" ("Name", "viewAdmin", "removeUser", "addUser", "markAttendance", "assignTasks", "updateSeva", "addSeva")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [Name ?? '', !!viewAdmin, !!removeUser, !!addUser, !!markAttendance, !!assignTasks, !!updateSeva, !!addSeva]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { Name, viewAdmin, removeUser, addUser, markAttendance, assignTasks, updateSeva, addSeva } = req.body;
    const { rows } = await pool.query(
      `UPDATE "WebsiteRoles" SET "Name" = COALESCE($2, "Name"), "viewAdmin" = COALESCE($3, "viewAdmin"), "removeUser" = COALESCE($4, "removeUser"),
        "addUser" = COALESCE($5, "addUser"), "markAttendance" = COALESCE($6, "markAttendance"), "assignTasks" = COALESCE($7, "assignTasks"),
        "updateSeva" = COALESCE($8, "updateSeva"), "addSeva" = COALESCE($9, "addSeva") WHERE "id" = $1 RETURNING *`,
      [req.params.id, Name, viewAdmin, removeUser, addUser, markAttendance, assignTasks, updateSeva, addSeva]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Website role not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM "WebsiteRoles" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Website role not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
