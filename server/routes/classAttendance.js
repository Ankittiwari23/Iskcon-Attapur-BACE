import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const CA_BASE = `SELECT a.*, u."Name" as "UserName"
                 FROM "ClassAttendance" a
                 JOIN "users" u ON a."UserID" = u."id"`;

router.get('/', async (req, res) => {
  try {
    const { classID, userID, classTypeID, sessionID } = req.query;
    let baseQuery = CA_BASE;
    let baseParams = [];

    if (classID) {
      baseQuery = `${CA_BASE} WHERE a."ClassID" = $1`;
      baseParams = [classID];
    } else if (userID) {
      baseQuery = `${CA_BASE} WHERE a."UserID" = $1`;
      baseParams = [userID];
    } else if (classTypeID && sessionID) {
      baseQuery = `${CA_BASE} WHERE a."ClassTypeID" = $1 AND a."SessionID" = $2`;
      baseParams = [classTypeID, sessionID];
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['UserName'],
      req,
    });
    if (paginated) return res.json(paginated);

    let orderBy = 'ORDER BY a."ClassID", a."UserID"';
    if (classID) orderBy = 'ORDER BY u."Name"';
    else if (userID) orderBy = 'ORDER BY a."ClassID"';
    else if (classTypeID && sessionID) orderBy = 'ORDER BY a."ClassID", u."Name"';

    const { rows } = await pool.query(`${baseQuery} ${orderBy}`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ClassID, ClassTypeID, SessionID, UserID, Attended, MarkedByUser } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO "ClassAttendance" ("ClassID", "ClassTypeID", "SessionID", "UserID", "Attended", "MarkedByUser")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("ClassID", "UserID") DO UPDATE SET "Attended" = $5, "MarkedByUser" = $6 RETURNING *`,
      [ClassID, ClassTypeID, SessionID, UserID, !!Attended, MarkedByUser || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/bulk', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const r of records) {
      const { rows } = await client.query(
        `INSERT INTO "ClassAttendance" ("ClassID", "ClassTypeID", "SessionID", "UserID", "Attended", "MarkedByUser")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("ClassID", "UserID") DO UPDATE SET "Attended" = $5, "MarkedByUser" = $6 RETURNING *`,
        [r.ClassID, r.ClassTypeID, r.SessionID, r.UserID, !!r.Attended, r.MarkedByUser || null]
      );
      results.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(results);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { Attended, MarkedByUser } = req.body;
    const { rows } = await pool.query(
      'UPDATE "ClassAttendance" SET "Attended" = COALESCE($2, "Attended"), "MarkedByUser" = COALESCE($3, "MarkedByUser") WHERE "id" = $1 RETURNING *',
      [req.params.id, Attended, MarkedByUser]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Attendance record not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
