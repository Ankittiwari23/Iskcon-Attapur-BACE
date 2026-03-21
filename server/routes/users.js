// routes/users.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/Authenticate.js';
import { paginatedQuery } from '../db/queryHelper.js';

const router = Router();

const USERS_BASE = `SELECT u."id", u."Name", u."Role", u."Email", u."Phone",
        u."isBACEDevotee", u."JoinedDate", u."isActive",
        u."MemberTypeID", u."enrolledBY", u."MentorID", u."WebsiteRoleID",
        u."createdAt",
        m."MemberTypeName", w."Name" as "WebsiteRoleName"
 FROM "users" u
 LEFT JOIN "MemberType" m ON u."MemberTypeID" = m."id"
 LEFT JOIN "WebsiteRoles" w ON u."WebsiteRoleID" = w."id"`;

router.get('/', async (req, res) => {
  try {
    const paginated = await paginatedQuery(pool, USERS_BASE, [], {
      searchColumns: ['Name', 'Email', 'Phone', 'Role', 'MemberTypeName', 'WebsiteRoleName'],
      req,
    });
    if (paginated) return res.json(paginated);

    const { rows } = await pool.query(`${USERS_BASE} ORDER BY u."id"`);
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
              u."MemberTypeID", u."WebsiteRoleID", u."createdAt",
              m."MemberTypeName", w."Name" as "WebsiteRoleName"
       FROM "users" u
       LEFT JOIN "MemberType" m ON u."MemberTypeID" = m."id"
       LEFT JOIN "WebsiteRoles" w ON u."WebsiteRoleID" = w."id"
       WHERE u."id" = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { Name, Role, Email, Phone, isBACEDevotee, JoinedDate, isActive,
            MemberTypeID, enrolledBY, MentorID, WebsiteRoleID } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO "users" ("Name", "Role", "Email", "Phone", "isBACEDevotee", "JoinedDate",
                            "isActive", "MemberTypeID", "enrolledBY", "MentorID", "WebsiteRoleID")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [Name ?? '', Role ?? 'Students', Email || null, Phone || null,
       !!isBACEDevotee, JoinedDate || null, isActive !== false,
       MemberTypeID || null, enrolledBY || null, MentorID || null, WebsiteRoleID || null]
    );
    const { PasswordHash: _, ...safeUser } = rows[0];
    res.status(201).json(safeUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { Name, Role, Email, Phone, isBACEDevotee, JoinedDate, isActive,
            MemberTypeID, enrolledBY, MentorID, WebsiteRoleID } = req.body;
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
        "MentorID"      = COALESCE($11, "MentorID"),
        "WebsiteRoleID" = COALESCE($12, "WebsiteRoleID")
       WHERE "id" = $1 RETURNING *`,
      [req.params.id, Name, Role, Email, Phone, isBACEDevotee, JoinedDate,
       isActive, MemberTypeID, enrolledBY, MentorID, WebsiteRoleID]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const { PasswordHash: _, ...safeUser } = rows[0];
    res.json(safeUser);
  } catch (e) {
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

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM "users" WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;