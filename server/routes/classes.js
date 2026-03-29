import { Router } from 'express';
import pool from '../db/pool.js';
import { paginatedQuery } from '../db/queryHelper.js';
import { requireRole } from '../middleware/Authenticate.js';

const router = Router();

const CLASSES_BASE = `
  SELECT c.*,
    t."ClassType",
    u."Name" as "InstructorName",
    ROW_NUMBER() OVER (PARTITION BY c."ClassTypeID", c."SessionID" ORDER BY c."id") AS "ClassNo"
  FROM "Classes" c
  JOIN "ClassType" t ON c."ClassTypeID" = t."id"
  LEFT JOIN "users" u ON c."ClassInstructor" = u."id"
`;

router.get('/', async (req, res) => {
  try {
    const { classTypeID, sessionID } = req.query;
    let baseQuery = CLASSES_BASE;
    let baseParams = [];

    if (classTypeID && sessionID) {
      baseQuery = `${CLASSES_BASE} WHERE c."ClassTypeID" = $1 AND c."SessionID" = $2`;
      baseParams = [classTypeID, sessionID];
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['ClassDescription', 'InstructorName', 'ClassType'],
      req,
    });
    if (paginated) return res.json(paginated);

    const orderBy = (classTypeID && sessionID)
      ? 'ORDER BY c."id"'
      : 'ORDER BY c."ClassTypeID", c."SessionID", c."id"';
    const { rows } = await pool.query(`${baseQuery} ${orderBy}`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, t."ClassType" FROM "Classes" c JOIN "ClassType" t ON c."ClassTypeID" = t."id" WHERE c."id" = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireRole('Admin'), async (req, res) => {
  try {
    const { ClassTypeID, SessionID, ClassDescription, isActive, StartDate, ClassInstructor, Remarks } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO "Classes" ("ClassTypeID", "SessionID", "ClassDescription", "isActive", "StartDate", "EndDate", "Duration", "DurationType", "ClassInstructor", "Remarks")
       VALUES ($1, $2, $3, $4, $5, $5, 1, 'SingleDay', $6, $7) RETURNING *`,
      [ClassTypeID, SessionID, ClassDescription ?? null, isActive !== false, StartDate || null, ClassInstructor ?? null, Remarks ?? null]
    );
    await pool.query(
      'UPDATE "ClassSessions" SET "TotalClasses" = "TotalClasses" + 1 WHERE "ClassTypeID" = $1 AND "SessionID" = $2',
      [ClassTypeID, SessionID]
    );

    const newClassId = rows[0].id;
    await pool.query(
      `INSERT INTO "FollowUps" ("ClassID", "ClassTypeID", "SessionID", "StudentID", "MentorID")
       SELECT $1, $2, $3, e."userID", u."MentorID"
       FROM "SessionEnrollments" e
       JOIN "users" u ON e."userID" = u."id"
       LEFT JOIN "UserSignals" us ON u."id" = us."UserID"
       WHERE e."ClassTypeID" = $2 AND e."SessionID" = $3
         AND (us."IsInFollowUpList" IS NULL OR us."IsInFollowUpList" = true)
       ON CONFLICT ("ClassID", "StudentID") DO NOTHING`,
      [newClassId, ClassTypeID, SessionID]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { ClassDescription, isActive, StartDate, ClassInstructor, Remarks } = req.body;
    const { rows } = await pool.query(
      `UPDATE "Classes" SET
        "ClassDescription" = COALESCE($2, "ClassDescription"),
        "isActive" = COALESCE($3, "isActive"),
        "StartDate" = COALESCE($4, "StartDate"),
        "EndDate" = COALESCE($4, "EndDate"),
        "Duration" = 1,
        "DurationType" = 'SingleDay',
        "ClassInstructor" = COALESCE($5, "ClassInstructor"),
        "Remarks" = COALESCE($6, "Remarks")
       WHERE "id" = $1 RETURNING *`,
      [req.params.id, ClassDescription, isActive, StartDate, ClassInstructor, Remarks]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const cls = await pool.query('SELECT "ClassTypeID", "SessionID" FROM "Classes" WHERE "id" = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM "Classes" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Class not found' });
    if (cls.rows[0]) {
      await pool.query(
        'UPDATE "ClassSessions" SET "TotalClasses" = GREATEST(0, "TotalClasses" - 1) WHERE "ClassTypeID" = $1 AND "SessionID" = $2',
        [cls.rows[0].ClassTypeID, cls.rows[0].SessionID]
      );
    }
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
