// routes/enrollmentInvites.js
import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/Authenticate.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

// ── POST /api/enrollment-invites
// Generate a new invite link for a session (Admin/Manager only)
router.post('/', authenticate, requireRole('Admin', 'Managers'), async (req, res) => {
  try {
    const { ClassTypeID, SessionID } = req.body;
    if (!ClassTypeID || !SessionID) {
      return res.status(400).json({ error: 'ClassTypeID and SessionID are required.' });
    }

    // Verify session exists
    const sess = await pool.query(
      `SELECT s.*, t."ClassType" FROM "ClassSessions" s
       JOIN "ClassType" t ON s."ClassTypeID" = t."id"
       WHERE s."ClassTypeID" = $1 AND s."SessionID" = $2`,
      [ClassTypeID, SessionID]
    );
    if (sess.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { rows } = await pool.query(
      `INSERT INTO "EnrollmentInvites"
         ("Token", "ClassTypeID", "SessionID", "CreatedByID", "ExpiresAt")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [token, ClassTypeID, SessionID, req.user.id, expiresAt]
    );

    res.status(201).json({
      ...rows[0],
      ClassType:   sess.rows[0].ClassType,
      SessionName: sess.rows[0].SessionName,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/enrollment-invites
// List all invite links (Admin/Manager)
router.get('/', authenticate, requireRole('Admin', 'Managers'), async (req, res) => {
  try {
    const { ClassTypeID, SessionID } = req.query;
    const base = `
      SELECT i.*, t."ClassType", s."SessionName",
             u."Name" as "CreatedByName"
      FROM "EnrollmentInvites" i
      JOIN "ClassType" t      ON i."ClassTypeID" = t."id"
      JOIN "ClassSessions" s  ON i."ClassTypeID" = s."ClassTypeID"
                             AND i."SessionID"   = s."SessionID"
      JOIN "users" u          ON i."CreatedByID" = u."id"
    `;
    let baseQuery = base;
    let baseParams = [];
    if (ClassTypeID && SessionID) {
      baseQuery = `${base} WHERE i."ClassTypeID" = $1 AND i."SessionID" = $2`;
      baseParams = [ClassTypeID, SessionID];
    }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['ClassType', 'SessionName', 'CreatedByName', 'Token'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${baseQuery} ORDER BY i."createdAt" DESC`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/enrollment-invites/:id
// Deactivate/delete an invite link
router.delete('/:id', authenticate, requireRole('Admin', 'Managers'), async (req, res) => {
  try {
    await pool.query(
      `UPDATE "EnrollmentInvites" SET "IsActive" = false WHERE "id" = $1`,
      [req.params.id]
    );
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// PUBLIC ROUTES — No auth needed
// ══════════════════════════════════════════════════════════════

// ── GET /api/enrollment-invites/public/:token
// Validate token and return session info for the public form
router.get('/public/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, t."ClassType", s."SessionName", s."StartDate", s."EndDate"
       FROM "EnrollmentInvites" i
       JOIN "ClassType" t     ON i."ClassTypeID" = t."id"
       JOIN "ClassSessions" s ON i."ClassTypeID" = s."ClassTypeID"
                             AND i."SessionID"   = s."SessionID"
       WHERE i."Token" = $1`,
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid enrollment link.' });
    }

    const invite = rows[0];

    if (!invite.IsActive) {
      return res.status(410).json({ error: 'This enrollment link has been deactivated.' });
    }

    if (new Date() > new Date(invite.ExpiresAt)) {
      return res.status(410).json({ error: 'This enrollment link has expired.' });
    }

    // Return only safe info for the public form
    res.json({
      ClassType:   invite.ClassType,
      SessionName: invite.SessionName,
      StartDate:   invite.StartDate,
      EndDate:     invite.EndDate,
      ExpiresAt:   invite.ExpiresAt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/enrollment-invites/public/:token/submit
// Student submits enrollment form — creates PendingEnrollment
router.post('/public/:token/submit', async (req, res) => {
  try {
    const { Name, Age, Email, Phone } = req.body;

    if (!Name || !Email || !Phone) {
      return res.status(400).json({ error: 'Name, Email and Phone are required.' });
    }

    // Validate token
    const { rows: inviteRows } = await pool.query(
      `SELECT * FROM "EnrollmentInvites" WHERE "Token" = $1`,
      [req.params.token]
    );

    if (inviteRows.length === 0) {
      return res.status(404).json({ error: 'Invalid enrollment link.' });
    }

    const invite = inviteRows[0];

    if (!invite.IsActive) {
      return res.status(410).json({ error: 'This enrollment link has been deactivated.' });
    }

    if (new Date() > new Date(invite.ExpiresAt)) {
      return res.status(410).json({ error: 'This enrollment link has expired.' });
    }

    // Check if same email already submitted for this session
    const existing = await pool.query(
      `SELECT "id", "Status" FROM "PendingEnrollments"
       WHERE "InviteID" = $1 AND LOWER("Email") = LOWER($2)`,
      [invite.id, Email]
    );

    if (existing.rows.length > 0) {
      const status = existing.rows[0].Status;
      if (status === 'pending') {
        return res.status(409).json({ error: 'You have already submitted a request for this session. Please wait for approval.' });
      }
      if (status === 'approved') {
        return res.status(409).json({ error: 'You are already enrolled in this session.' });
      }
      // if rejected, allow resubmission
    }

    // Create pending enrollment
    const { rows } = await pool.query(
      `INSERT INTO "PendingEnrollments"
         ("InviteID", "ClassTypeID", "SessionID", "Name", "Age", "Email", "Phone")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING "id"`,
      [invite.id, invite.ClassTypeID, invite.SessionID, Name, Age || null, Email, Phone]
    );

    res.status(201).json({
      message: 'Your enrollment request has been submitted! An admin will review and approve it shortly.',
      id: rows[0].id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// PENDING ENROLLMENTS — Admin/Manager approval
// ══════════════════════════════════════════════════════════════

// ── GET /api/enrollment-invites/pending
// List all pending enrollments
router.get('/pending', authenticate, requireRole('Admin', 'Managers'), async (req, res) => {
  try {
    const { ClassTypeID, SessionID, status } = req.query;
    const base = `
      SELECT p.*, t."ClassType", s."SessionName",
             r."Name" as "ReviewedByName"
      FROM "PendingEnrollments" p
      JOIN "ClassType" t     ON p."ClassTypeID" = t."id"
      JOIN "ClassSessions" s ON p."ClassTypeID" = s."ClassTypeID"
                            AND p."SessionID"   = s."SessionID"
      LEFT JOIN "users" r    ON p."ReviewedByID" = r."id"
      WHERE 1=1
    `;
    let baseQuery = base;
    const baseParams = [];
    let i = 1;
    if (ClassTypeID) { baseQuery += ` AND p."ClassTypeID" = $${i++}`; baseParams.push(ClassTypeID); }
    if (SessionID)   { baseQuery += ` AND p."SessionID"   = $${i++}`; baseParams.push(SessionID); }
    if (status)      { baseQuery += ` AND p."Status"       = $${i++}`; baseParams.push(status); }
    else             { baseQuery += ` AND p."Status" = 'pending'`; }

    const paginated = await paginatedQuery(pool, baseQuery, baseParams, {
      searchColumns: ['Name', 'Email', 'Phone', 'ClassType', 'SessionName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${baseQuery} ORDER BY p."createdAt" DESC`, baseParams);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/enrollment-invites/pending/:id/approve
// Approve a pending enrollment — creates user + enrolls them
router.post('/pending/:id/approve', authenticate, requireRole('Admin', 'Managers'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get pending record
    const { rows: pending } = await client.query(
      `SELECT * FROM "PendingEnrollments" WHERE "id" = $1 AND "Status" = 'pending'`,
      [req.params.id]
    );
    if (pending.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending enrollment not found or already reviewed.' });
    }

    const p = pending[0];

    // Check if user with this email already exists
    let userID;
    const existingUser = await client.query(
      `SELECT "id" FROM "users" WHERE LOWER("Email") = LOWER($1)`,
      [p.Email]
    );

    const mentorID = req.user.role === 'Managers' ? req.user.id : null;

    if (existingUser.rows.length > 0) {
      userID = existingUser.rows[0].id;
      if (mentorID) {
        await client.query(
          'UPDATE "users" SET "MentorID" = $2 WHERE "id" = $1 AND "MentorID" IS NULL',
          [userID, mentorID]
        );
      }
    } else {
      const { rows: newUser } = await client.query(
        `INSERT INTO "users"
           ("Name", "Role", "Email", "Phone", "isActive", "JoinedDate", "enrolledBY", "MentorID")
         VALUES ($1, 'Students', $2, $3, true, CURRENT_DATE, $4, $5)
         RETURNING "id"`,
        [p.Name, p.Email, p.Phone, req.user.id, mentorID]
      );
      userID = newUser[0].id;
    }

    // Check not already enrolled
    const alreadyEnrolled = await client.query(
      `SELECT "id" FROM "SessionEnrollments"
       WHERE "ClassTypeID" = $1 AND "SessionID" = $2 AND "userID" = $3`,
      [p.ClassTypeID, p.SessionID, userID]
    );

    if (alreadyEnrolled.rows.length === 0) {
      await client.query(
        `INSERT INTO "SessionEnrollments"
           ("ClassTypeID", "SessionID", "userID", "EnrolledByUserID", "StartDate")
         VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
        [p.ClassTypeID, p.SessionID, userID, req.user.id]
      );

      await client.query(
        `UPDATE "ClassSessions" SET "TotalEnrolled" = "TotalEnrolled" + 1
         WHERE "ClassTypeID" = $1 AND "SessionID" = $2`,
        [p.ClassTypeID, p.SessionID]
      );

      await client.query(
        `INSERT INTO "UserSignals" ("UserID", "Signal", "IsInFollowUpList")
         VALUES ($1, 'green', true)
         ON CONFLICT ("UserID") DO NOTHING`,
        [userID]
      );

      const studentMentorRes = await client.query(
        'SELECT "MentorID" FROM "users" WHERE "id" = $1', [userID]
      );
      const studentMentorID = studentMentorRes.rows[0]?.MentorID || null;

      await client.query(
        `INSERT INTO "FollowUps" ("ClassID", "ClassTypeID", "SessionID", "StudentID", "MentorID")
         SELECT c."id", $1, $2, $3, $4
         FROM "Classes" c
         WHERE c."ClassTypeID" = $1 AND c."SessionID" = $2
         ON CONFLICT ("ClassID", "StudentID") DO NOTHING`,
        [p.ClassTypeID, p.SessionID, userID, studentMentorID]
      );
    }

    await client.query(
      `UPDATE "PendingEnrollments"
       SET "Status" = 'approved', "ReviewedByID" = $2,
           "ReviewedAt" = NOW(), "UserID" = $3
       WHERE "id" = $1`,
      [p.id, req.user.id, userID]
    );

    await client.query('COMMIT');
    res.json({ message: 'Enrollment approved.', userID });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── POST /api/enrollment-invites/pending/:id/reject
router.post('/pending/:id/reject', authenticate, requireRole('Admin', 'Managers'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE "PendingEnrollments"
       SET "Status" = 'rejected', "ReviewedByID" = $2, "ReviewedAt" = NOW()
       WHERE "id" = $1 AND "Status" = 'pending'
       RETURNING "id"`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found or already reviewed.' });
    }
    res.json({ message: 'Enrollment rejected.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;