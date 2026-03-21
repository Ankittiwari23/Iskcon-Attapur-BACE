import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const SE_BASE = `
  SELECT e.*,
    u."Name"  AS "UserName",
    eb."Name" AS "EnrolledByName",
    t."ClassType",
    s."SessionName"
  FROM "SessionEnrollments" e
  JOIN "users" u          ON e."userID"           = u."id"
  LEFT JOIN "users" eb    ON e."EnrolledByUserID"  = eb."id"
  JOIN "ClassType" t      ON e."ClassTypeID"       = t."id"
  JOIN "ClassSessions" s  ON e."ClassTypeID"       = s."ClassTypeID"
                         AND e."SessionID"         = s."SessionID"
`;

router.get('/', async (req, res) => {
  try {
    const { classTypeID, sessionID, userID } = req.query;
    let baseQuery = SE_BASE;
    let baseParams = [];

    if (classTypeID && sessionID) {
      baseQuery = `${SE_BASE} WHERE e."ClassTypeID" = $1 AND e."SessionID" = $2`;
      baseParams = [classTypeID, sessionID];
    } else if (userID) {
      baseQuery = `${SE_BASE} WHERE e."userID" = $1`;
      baseParams = [userID];
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['UserName', 'EnrolledByName', 'ClassType', 'SessionName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${baseQuery} ORDER BY e."createdAt" DESC`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ClassTypeID, SessionID, userID, EnrolledByUserID, StartDate, EndDate } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO "SessionEnrollments" ("ClassTypeID", "SessionID", "userID", "EnrolledByUserID", "StartDate", "EndDate")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [ClassTypeID, SessionID, userID, EnrolledByUserID || null, StartDate || null, EndDate || null]
    );
    await pool.query(
      'UPDATE "ClassSessions" SET "TotalEnrolled" = "TotalEnrolled" + 1 WHERE "ClassTypeID" = $1 AND "SessionID" = $2',
      [ClassTypeID, SessionID]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const enr = await pool.query('SELECT "ClassTypeID", "SessionID" FROM "SessionEnrollments" WHERE "id" = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM "SessionEnrollments" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Enrollment not found' });
    if (enr.rows[0]) {
      await pool.query(
        'UPDATE "ClassSessions" SET "TotalEnrolled" = GREATEST(0, "TotalEnrolled" - 1) WHERE "ClassTypeID" = $1 AND "SessionID" = $2',
        [enr.rows[0].ClassTypeID, enr.rows[0].SessionID]
      );
    }
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;