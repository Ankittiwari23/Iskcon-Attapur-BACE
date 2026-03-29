import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const FU_BASE = `
  SELECT f.*,
    s."Name"  AS "StudentName",
    m."Name"  AS "MentorName",
    c."ClassDescription",
    c."StartDate" AS "ClassDate",
    ct."ClassType",
    cs."SessionName",
    ub."Name" AS "UpdatedByName",
    us."Signal",
    COALESCE(att."totalClasses", 0) AS "studentTotalClasses",
    COALESCE(att."attended", 0) AS "studentAttended"
  FROM "FollowUps" f
  JOIN "users" s            ON f."StudentID"   = s."id"
  LEFT JOIN "users" m       ON f."MentorID"    = m."id"
  JOIN "Classes" c          ON f."ClassID"     = c."id"
  JOIN "ClassType" ct       ON f."ClassTypeID" = ct."id"
  JOIN "ClassSessions" cs   ON f."ClassTypeID" = cs."ClassTypeID"
                           AND f."SessionID"   = cs."SessionID"
  LEFT JOIN "users" ub      ON f."UpdatedByID" = ub."id"
  LEFT JOIN "UserSignals" us ON f."StudentID"  = us."UserID"
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT cl."id") AS "totalClasses",
      COUNT(DISTINCT CASE WHEN ca."Attended" = true THEN ca."ClassID" END) AS "attended"
    FROM "SessionEnrollments" e
    JOIN "Classes" cl ON cl."ClassTypeID" = e."ClassTypeID" AND cl."SessionID" = e."SessionID"
    LEFT JOIN "ClassAttendance" ca ON ca."ClassID" = cl."id" AND ca."UserID" = e."userID"
    WHERE e."userID" = f."StudentID"
  ) att ON true
`;

router.get('/', async (req, res) => {
  try {
    const { classTypeID, sessionID, classID, mentorID, studentID } = req.query;
    let baseQuery = FU_BASE;
    const baseParams = [];
    const conditions = [];
    let idx = 1;

    if (classTypeID) { conditions.push(`f."ClassTypeID" = $${idx++}`); baseParams.push(classTypeID); }
    if (sessionID)   { conditions.push(`f."SessionID" = $${idx++}`);   baseParams.push(sessionID); }
    if (classID)     { conditions.push(`f."ClassID" = $${idx++}`);     baseParams.push(classID); }
    if (mentorID)    { conditions.push(`f."MentorID" = $${idx++}`);    baseParams.push(mentorID); }
    if (studentID)   { conditions.push(`f."StudentID" = $${idx++}`);   baseParams.push(studentID); }

    if (conditions.length) {
      baseQuery = `${FU_BASE} WHERE ${conditions.join(' AND ')}`;
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['StudentName', 'MentorName', 'ClassDescription', 'ClassType', 'SessionName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${baseQuery} ORDER BY c."StartDate" DESC, s."Name"`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { Status, Response } = req.body;
    const updatedBy = req.user?.id || null;
    const { rows } = await pool.query(
      `UPDATE "FollowUps"
       SET "Status"      = COALESCE($2, "Status"),
           "Response"    = COALESCE($3, "Response"),
           "UpdatedByID" = $4,
           "updatedAt"   = NOW()
       WHERE "id" = $1 RETURNING *`,
      [req.params.id, Status, Response, updatedBy]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Follow-up not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const { mentorID } = req.query;
    let mentorFilter = '';
    const params = [];

    if (mentorID) {
      mentorFilter = 'WHERE f."MentorID" = $1';
      params.push(mentorID);
    }

    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                              AS "total",
        COUNT(*) FILTER (WHERE f."Status" = 'no_response')    AS "noResponse",
        COUNT(*) FILTER (WHERE f."Status" = 'call_not_attended') AS "callNotAttended",
        COUNT(*) FILTER (WHERE f."Status" = 'confirmed')      AS "confirmed",
        COUNT(*) FILTER (WHERE f."Status" = 'denied')         AS "denied",
        COUNT(*) FILTER (WHERE f."AttendedResult" = 'attended') AS "attended",
        COUNT(*) FILTER (WHERE f."AttendedResult" = 'missed')   AS "missed"
      FROM "FollowUps" f
      ${mentorFilter}
    `, params);

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/manager-stats', async (req, res) => {
  try {
    const { classTypeID, sessionID } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;
    if (classTypeID) { conditions.push(`f."ClassTypeID" = $${idx++}`); params.push(classTypeID); }
    if (sessionID)   { conditions.push(`f."SessionID" = $${idx++}`);   params.push(sessionID); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT
        m."id"   AS "ManagerID",
        m."Name" AS "ManagerName",
        COUNT(DISTINCT f."StudentID")                           AS "totalMentees",
        COUNT(*)                                                AS "totalFollowUps",
        COUNT(*) FILTER (WHERE f."Status" != 'no_response')     AS "completed",
        COUNT(*) FILTER (WHERE f."Status" = 'confirmed')        AS "confirmed",
        COUNT(*) FILTER (WHERE f."AttendedResult" = 'attended') AS "attended",
        COUNT(*) FILTER (WHERE f."Status" = 'confirmed' AND f."AttendedResult" = 'attended') AS "converted",
        CASE
          WHEN COUNT(*) FILTER (WHERE f."Status" = 'confirmed') = 0 THEN 0
          ELSE ROUND(
            COUNT(*) FILTER (WHERE f."Status" = 'confirmed' AND f."AttendedResult" = 'attended')::numeric
            / NULLIF(COUNT(*) FILTER (WHERE f."Status" = 'confirmed'), 0) * 100
          )
        END AS "conversionRate"
      FROM "FollowUps" f
      JOIN "users" m ON f."MentorID" = m."id"
      ${where}
      GROUP BY m."id", m."Name"
      ORDER BY "conversionRate" DESC, "confirmed" DESC
    `, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
