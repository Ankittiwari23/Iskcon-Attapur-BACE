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

    const enrollerID = EnrolledByUserID || req.user?.id || null;
    if (enrollerID) {
      const enrollerRes = await pool.query('SELECT "Role" FROM "users" WHERE "id" = $1', [enrollerID]);
      if (enrollerRes.rows[0]?.Role === 'Managers') {
        await pool.query(
          'UPDATE "users" SET "MentorID" = $2 WHERE "id" = $1 AND "MentorID" IS NULL',
          [userID, enrollerID]
        );
      }
    }

    await pool.query(
      `INSERT INTO "UserSignals" ("UserID", "Signal", "IsInFollowUpList")
       VALUES ($1, 'green', true)
       ON CONFLICT ("UserID") DO NOTHING`,
      [userID]
    );

    const mentorRes = await pool.query('SELECT "MentorID" FROM "users" WHERE "id" = $1', [userID]);
    const mentorID = mentorRes.rows[0]?.MentorID || null;
    await pool.query(
      `INSERT INTO "FollowUps" ("ClassID", "ClassTypeID", "SessionID", "StudentID", "MentorID")
       SELECT c."id", $1, $2, $3, $4
       FROM "Classes" c
       WHERE c."ClassTypeID" = $1 AND c."SessionID" = $2
       ON CONFLICT ("ClassID", "StudentID") DO NOTHING`,
      [ClassTypeID, SessionID, userID, mentorID]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Bulk enroll multiple students into one session ───────────
router.post('/bulk', async (req, res) => {
  const { ClassTypeID, SessionID, userIDs, EnrolledByUserID } = req.body;
  if (!ClassTypeID || !SessionID || !Array.isArray(userIDs) || userIDs.length === 0) {
    return res.status(400).json({ error: 'ClassTypeID, SessionID and a non-empty userIDs array are required.' });
  }

  const enrollerID = EnrolledByUserID || req.user?.id || null;
  let enrollerRole = null;
  if (enrollerID) {
    const r = await pool.query('SELECT "Role" FROM "users" WHERE "id" = $1', [enrollerID]);
    enrollerRole = r.rows[0]?.Role || null;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const userID of userIDs) {
      const ins = await client.query(
        `INSERT INTO "SessionEnrollments" ("ClassTypeID", "SessionID", "userID", "EnrolledByUserID")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("ClassTypeID", "SessionID", "userID") DO NOTHING
         RETURNING *`,
        [ClassTypeID, SessionID, userID, EnrolledByUserID || null]
      );
      if (ins.rows.length === 0) continue; // already enrolled — skip

      await client.query(
        'UPDATE "ClassSessions" SET "TotalEnrolled" = "TotalEnrolled" + 1 WHERE "ClassTypeID" = $1 AND "SessionID" = $2',
        [ClassTypeID, SessionID]
      );

      if (enrollerRole === 'Managers') {
        await client.query(
          'UPDATE "users" SET "MentorID" = $2 WHERE "id" = $1 AND "MentorID" IS NULL',
          [userID, enrollerID]
        );
      }

      await client.query(
        `INSERT INTO "UserSignals" ("UserID", "Signal", "IsInFollowUpList")
         VALUES ($1, 'green', true)
         ON CONFLICT ("UserID") DO NOTHING`,
        [userID]
      );

      const mentorRes = await client.query('SELECT "MentorID" FROM "users" WHERE "id" = $1', [userID]);
      const mentorID = mentorRes.rows[0]?.MentorID || null;
      await client.query(
        `INSERT INTO "FollowUps" ("ClassID", "ClassTypeID", "SessionID", "StudentID", "MentorID")
         SELECT c."id", $1, $2, $3, $4
         FROM "Classes" c
         WHERE c."ClassTypeID" = $1 AND c."SessionID" = $2
         ON CONFLICT ("ClassID", "StudentID") DO NOTHING`,
        [ClassTypeID, SessionID, userID, mentorID]
      );

      created.push(ins.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ enrolled: created.length, skipped: userIDs.length - created.length });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
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