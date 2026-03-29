import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const US_BASE = `
  SELECT us.*,
    u."Name"  AS "UserName",
    u."Role"  AS "UserRole",
    m."Name"  AS "MentorName",
    ub."Name" AS "UpdatedByName",
    COALESCE(att."totalClasses", 0) AS "totalClasses",
    COALESCE(att."attended", 0) AS "attended"
  FROM "UserSignals" us
  JOIN "users" u          ON us."UserID"      = u."id"
  LEFT JOIN "users" m     ON u."MentorID"     = m."id"
  LEFT JOIN "users" ub    ON us."UpdatedByID" = ub."id"
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT c."id") AS "totalClasses",
      COUNT(DISTINCT CASE WHEN ca."Attended" = true THEN ca."ClassID" END) AS "attended"
    FROM "SessionEnrollments" e
    JOIN "Classes" c ON c."ClassTypeID" = e."ClassTypeID" AND c."SessionID" = e."SessionID"
    LEFT JOIN "ClassAttendance" ca ON ca."ClassID" = c."id" AND ca."UserID" = e."userID"
    WHERE e."userID" = us."UserID"
  ) att ON true
`;

router.get('/', async (req, res) => {
  try {
    const { mentorID } = req.query;
    let baseQuery = US_BASE;
    const baseParams = [];

    if (mentorID) {
      baseQuery = `${US_BASE} WHERE u."MentorID" = $1`;
      baseParams.push(mentorID);
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['UserName', 'MentorName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${baseQuery} ORDER BY u."Name"`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:userID', async (req, res) => {
  try {
    const { Signal } = req.body;
    const updatedBy = req.user?.id || null;
    const { rows } = await pool.query(
      `UPDATE "UserSignals"
       SET "Signal"      = $2,
           "UpdatedByID" = $3,
           "updatedAt"   = NOW()
       WHERE "UserID" = $1 RETURNING *`,
      [req.params.userID, Signal, updatedBy]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User signal not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:userID/toggle-followup', async (req, res) => {
  try {
    const { IsInFollowUpList } = req.body;
    const updatedBy = req.user?.id || null;
    const { rows } = await pool.query(
      `UPDATE "UserSignals"
       SET "IsInFollowUpList" = $2,
           "UpdatedByID"      = $3,
           "updatedAt"        = NOW()
       WHERE "UserID" = $1 RETURNING *`,
      [req.params.userID, IsInFollowUpList, updatedBy]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User signal not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
