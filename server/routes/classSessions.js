import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const classTypeID = req.query.classTypeID;
    const base = `SELECT s.*, t."ClassType", u."Name" as "InchargeName",
                    CONCAT(s."ClassTypeID", '.', s."SessionID") as "DisplaySessionID"
                  FROM "ClassSessions" s
                  JOIN "ClassType" t ON s."ClassTypeID" = t."id"
                  LEFT JOIN "users" u ON s."SessionIncharge" = u."id"`;

    let baseQuery = base;
    let baseParams = [];
    if (classTypeID) {
      baseQuery = `${base} WHERE s."ClassTypeID" = $1`;
      baseParams = [classTypeID];
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['SessionName', 'ClassType', 'InchargeName', 'DisplaySessionID'],
      req,
    });
    if (paginated) return res.json(paginated);

    const orderBy = classTypeID ? 'ORDER BY s."SessionID"' : 'ORDER BY s."ClassTypeID", s."SessionID"';
    const { rows } = await pool.query(`${baseQuery} ${orderBy}`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, t."ClassType" FROM "ClassSessions" s JOIN "ClassType" t ON s."ClassTypeID" = t."id" WHERE s."id" = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class session not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ClassTypeID, SessionName, StartDate, EndDate, SessionIncharge } = req.body;
    const client = await pool.connect();
    try {
      const nextSession = await client.query(
        'SELECT COALESCE(MAX("SessionID"), 0) + 1 AS next FROM "ClassSessions" WHERE "ClassTypeID" = $1',
        [ClassTypeID]
      );
      const SessionID = nextSession.rows[0].next;
      const { rows } = await client.query(
        `INSERT INTO "ClassSessions" ("ClassTypeID", "SessionID", "SessionName", "StartDate", "EndDate", "SessionIncharge")
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [ClassTypeID, SessionID, SessionName ?? '', StartDate || null, EndDate || null, SessionIncharge || null]
      );
      await client.query('UPDATE "ClassType" SET "currentActiveSession" = $2 WHERE "id" = $1', [ClassTypeID, SessionID]);
      res.status(201).json(rows[0]);
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { SessionName, StartDate, EndDate, SessionIncharge, TotalEnrolled, TotalClasses } = req.body;
    const { rows } = await pool.query(
      `UPDATE "ClassSessions" SET "SessionName" = COALESCE($2, "SessionName"), "StartDate" = COALESCE($3, "StartDate"),
        "EndDate" = COALESCE($4, "EndDate"), "SessionIncharge" = COALESCE($5, "SessionIncharge"),
        "TotalEnrolled" = COALESCE($6, "TotalEnrolled"), "TotalClasses" = COALESCE($7, "TotalClasses") WHERE "id" = $1 RETURNING *`,
      [req.params.id, SessionName, StartDate, EndDate, SessionIncharge, TotalEnrolled, TotalClasses]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class session not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM "ClassSessions" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Class session not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
