import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

async function recalcSignal(client, userID) {
  const { rows } = await client.query(`
    SELECT
      COUNT(DISTINCT c."id") AS "totalClasses",
      COUNT(DISTINCT CASE WHEN ca."Attended" = true THEN ca."ClassID" END) AS "attended"
    FROM "SessionEnrollments" e
    JOIN "Classes" c ON c."ClassTypeID" = e."ClassTypeID" AND c."SessionID" = e."SessionID"
    LEFT JOIN "ClassAttendance" ca ON ca."ClassID" = c."id" AND ca."UserID" = e."userID"
    WHERE e."userID" = $1
  `, [userID]);

  const total = parseInt(rows[0]?.totalClasses) || 0;
  const attended = parseInt(rows[0]?.attended) || 0;
  const pct = total > 0 ? (attended / total * 100) : 100;

  let signal;
  if (pct >= 80) signal = 'green';
  else if (pct >= 60) signal = 'yellow';
  else if (pct >= 40) signal = 'orange';
  else signal = 'red';

  await client.query(
    `UPDATE "UserSignals" SET "Signal" = $2, "updatedAt" = NOW() WHERE "UserID" = $1`,
    [userID, signal]
  );
}

async function isAdminOrInstructor(req, classID) {
  if (req.user?.role === 'Admin') return true;
  const { rows } = await pool.query(
    'SELECT "ClassInstructor" FROM "Classes" WHERE "id" = $1',
    [classID]
  );
  return rows.length > 0 && rows[0].ClassInstructor === req.user?.id;
}

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
    if (!(await isAdminOrInstructor(req, ClassID))) {
      return res.status(403).json({ error: 'Only the class instructor or an Admin can mark attendance.' });
    }
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

  const classID = records[0].ClassID;
  if (!(await isAdminOrInstructor(req, classID))) {
    return res.status(403).json({ error: 'Only the class instructor or an Admin can mark attendance.' });
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
    for (const r of records) {
      await client.query(
        `UPDATE "FollowUps"
         SET "AttendedResult" = $3, "updatedAt" = NOW()
         WHERE "ClassID" = $1 AND "StudentID" = $2`,
        [r.ClassID, r.UserID, r.Attended ? 'attended' : 'missed']
      );
    }

    const uniqueStudents = [...new Set(records.map(r => r.UserID))];
    for (const uid of uniqueStudents) {
      await recalcSignal(client, uid);
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
    const existing = await pool.query('SELECT "ClassID" FROM "ClassAttendance" WHERE "id" = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Attendance record not found' });
    if (!(await isAdminOrInstructor(req, existing.rows[0].ClassID))) {
      return res.status(403).json({ error: 'Only the class instructor or an Admin can update attendance.' });
    }
    const { rows } = await pool.query(
      'UPDATE "ClassAttendance" SET "Attended" = COALESCE($2, "Attended"), "MarkedByUser" = COALESCE($3, "MarkedByUser") WHERE "id" = $1 RETURNING *',
      [req.params.id, Attended, MarkedByUser]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
