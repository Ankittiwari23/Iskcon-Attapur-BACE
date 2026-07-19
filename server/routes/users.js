import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/Authenticate.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

let HAS_USER_SIGNALS = null;
async function checkUserSignals(pool) {
  if (HAS_USER_SIGNALS === true) return true;
  try {
    await pool.query('SELECT 1 FROM "UserSignals" LIMIT 0');
    HAS_USER_SIGNALS = true;
  } catch { HAS_USER_SIGNALS = false; }
  return HAS_USER_SIGNALS;
}

function getUsersBase(withSignals) {
  const signalCols = withSignals ? `, us."Signal", us."IsInFollowUpList"` : '';
  const signalJoin = withSignals ? `LEFT JOIN "UserSignals" us ON u."id" = us."UserID"` : '';
  return `SELECT u."id", u."Name", u."Role", u."Email", u."Phone",
        u."isBACEDevotee", u."JoinedDate", u."isActive",
        u."MemberTypeID", u."enrolledBY", u."MentorID",
        u."createdAt",
        m."MemberTypeName",
        mentor."Name" as "MentorName"${signalCols}
 FROM "users" u
 LEFT JOIN "MemberType" m ON u."MemberTypeID" = m."id"
 LEFT JOIN "users" mentor ON u."MentorID" = mentor."id"
 ${signalJoin}`;
}

router.get('/', async (req, res) => {
  try {
    const withSignals = await checkUserSignals(pool);
    const base = getUsersBase(withSignals);
    const paginated = await paginatedQuery(pool, base, [], {
      searchColumns: ['Name', 'Email', 'Phone', 'Role', 'MemberTypeName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${base} ORDER BY u."id"`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u."id", u."Name", u."Role", u."Email", u."Phone",
              u."isBACEDevotee", u."JoinedDate", u."isActive",
              u."MemberTypeID", u."createdAt",
              m."MemberTypeName"
       FROM "users" u
       LEFT JOIN "MemberType" m ON u."MemberTypeID" = m."id"
       WHERE u."id" = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/detail', async (req, res) => {
  try {
    const userId = req.params.id;
    const withSignals = await checkUserSignals(pool);
    const base = getUsersBase(withSignals);
    const userRes = await pool.query(
      `${base} WHERE u."id" = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const enrollments = await pool.query(
      `SELECT e."id", e."ClassTypeID", e."SessionID", e."StartDate", e."EndDate",
              ct."ClassType", cs."SessionName",
              cs."TotalClasses",
              COUNT(ca."id") FILTER (WHERE ca."Attended" = true) AS "attended",
              COUNT(ca."id") AS "totalMarked"
       FROM "SessionEnrollments" e
       JOIN "ClassType" ct ON e."ClassTypeID" = ct."id"
       JOIN "ClassSessions" cs ON e."ClassTypeID" = cs."ClassTypeID" AND e."SessionID" = cs."SessionID"
       LEFT JOIN "Classes" c ON c."ClassTypeID" = e."ClassTypeID" AND c."SessionID" = e."SessionID"
       LEFT JOIN "ClassAttendance" ca ON ca."ClassID" = c."id" AND ca."UserID" = e."userID"
       WHERE e."userID" = $1
       GROUP BY e."id", e."ClassTypeID", e."SessionID", e."StartDate", e."EndDate",
                ct."ClassType", cs."SessionName", cs."TotalClasses"
       ORDER BY e."createdAt" DESC`,
      [userId]
    );

    res.json({ user: userRes.rows[0], enrollments: enrollments.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { Name, Role, Email, Phone, Password, isBACEDevotee, JoinedDate, isActive,
            MemberTypeID, enrolledBY, MentorID } = req.body;

    const passwordHash = Password ? await bcrypt.hash(Password, 10) : null;

    const { rows } = await pool.query(
      `INSERT INTO "users" ("Name", "Role", "Email", "Phone", "PasswordHash", "isBACEDevotee", "JoinedDate",
                            "isActive", "MemberTypeID", "enrolledBY", "MentorID")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [Name ?? '', Role ?? 'Students', Email || null, Phone || null, passwordHash,
       !!isBACEDevotee, JoinedDate || null, isActive !== false,
       MemberTypeID || null, enrolledBY || null, MentorID || null]
    );
    const { PasswordHash: _, ...safeUser } = rows[0];
    res.status(201).json(safeUser);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { Name, Role, Email, Phone, isBACEDevotee, JoinedDate, isActive,
            MemberTypeID, enrolledBY, MentorID } = req.body;
    const { rows } = await pool.query(
      `UPDATE "users" SET
        "Name"          = COALESCE($2,  "Name"),
        "Role"          = COALESCE($3,  "Role"),
        "Email"         = COALESCE($4,  "Email"),
        "Phone"         = COALESCE($5,  "Phone"),
        "isBACEDevotee" = COALESCE($6,  "isBACEDevotee"),
        "JoinedDate"    = COALESCE($7,  "JoinedDate"),
        "isActive"      = COALESCE($8,  "isActive"),
        "MemberTypeID"  = COALESCE($9,  "MemberTypeID"),
        "enrolledBY"    = COALESCE($10, "enrolledBY"),
        "MentorID"      = COALESCE($11, "MentorID")
       WHERE "id" = $1 RETURNING *`,
      [req.params.id, Name, Role, Email, Phone, isBACEDevotee, JoinedDate,
       isActive, MemberTypeID, enrolledBY, MentorID]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Keep this student's follow-up rows pointing at their current mentor,
    // so reassigning a mentor here reflects in the mentor's Follow-Ups view.
    try {
      await pool.query(
        'UPDATE "FollowUps" SET "MentorID" = $2 WHERE "StudentID" = $1',
        [req.params.id, rows[0].MentorID]
      );
    } catch { /* FollowUps table optional; ignore if absent */ }

    const { PasswordHash: _, ...safeUser } = rows[0];
    res.json(safeUser);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── SET / CHANGE PASSWORD (Admin only) ───────────────────────
router.put('/:id/set-password', requireRole('Admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE "users" SET "PasswordHash" = $2 WHERE "id" = $1 RETURNING "id", "Name", "Email"`,
      [req.params.id, hash]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password updated.', user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── List a user's mentees (students they mentor) ─────────────
router.get('/:id/mentees', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT "id", "Name", "Role", "Email" FROM "users"
       WHERE "MentorID" = $1 ORDER BY "Name"`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reassign a set of students to a new mentor (or clear) ────
router.post('/reassign-mentor', requireRole('Admin'), async (req, res) => {
  try {
    const { studentIDs, newMentorID } = req.body;
    if (!Array.isArray(studentIDs) || studentIDs.length === 0) {
      return res.status(400).json({ error: 'studentIDs array is required.' });
    }
    const { rowCount } = await pool.query(
      `UPDATE "users" SET "MentorID" = $1 WHERE "id" = ANY($2::int[])`,
      [newMentorID || null, studentIDs]
    );

    // Keep their follow-up rows in sync with the new mentor.
    try {
      await pool.query(
        `UPDATE "FollowUps" SET "MentorID" = $1 WHERE "StudentID" = ANY($2::int[])`,
        [newMentorID || null, studentIDs]
      );
    } catch { /* FollowUps table optional; ignore if absent */ }

    res.json({ message: 'Mentor reassigned.', updated: rowCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const force = req.query.force === 'true';

    // Block deletion while the user still mentors students, unless forced.
    const mentees = await pool.query(
      'SELECT COUNT(*)::int AS count FROM "users" WHERE "MentorID" = $1',
      [req.params.id]
    );
    const menteeCount = mentees.rows[0]?.count || 0;
    if (menteeCount > 0 && !force) {
      return res.status(409).json({
        error: `This user is a mentor to ${menteeCount} student(s). Reassign them before deleting.`,
        menteeCount,
      });
    }

    const { rowCount } = await pool.query('DELETE FROM "users" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;