// routes/auth.js
// Install required packages first:
//   npm install bcrypt jsonwebtoken

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES = '7d'; // token valid for 7 days

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email, include WebsiteRole permissions
    const { rows } = await pool.query(
      `SELECT u.*, w."Name" as "WebsiteRoleName",
              w."viewAdmin", w."removeUser", w."addUser",
              w."markAttendance", w."assignTasks", w."updateSeva", w."addSeva"
       FROM "users" u
       LEFT JOIN "WebsiteRoles" w ON u."WebsiteRoleID" = w."id"
       WHERE LOWER(u."Email") = LOWER($1) AND u."isActive" = true`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (!user.PasswordHash) {
      return res.status(401).json({ error: 'Account not set up for login. Contact admin.' });
    }

    // Compare password
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Build JWT payload (never include PasswordHash)
    const payload = {
      id: user.id,
      name: user.Name,
      email: user.Email,
      role: user.Role,
      websiteRoleID: user.WebsiteRoleID,
      websiteRoleName: user.WebsiteRoleName,
      permissions: {
        viewAdmin:      user.viewAdmin      ?? false,
        removeUser:     user.removeUser     ?? false,
        addUser:        user.addUser        ?? false,
        markAttendance: user.markAttendance ?? false,
        assignTasks:    user.assignTasks    ?? false,
        updateSeva:     user.updateSeva     ?? false,
        addSeva:        user.addSeva        ?? false,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Return token + user info (no password hash)
    res.json({
      token,
      user: payload,
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /api/auth/me — verify token and return current user ──
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Re-fetch user to get latest data
    const { rows } = await pool.query(
      `SELECT u.*, w."Name" as "WebsiteRoleName",
              w."viewAdmin", w."removeUser", w."addUser",
              w."markAttendance", w."assignTasks", w."updateSeva", w."addSeva"
       FROM "users" u
       LEFT JOIN "WebsiteRoles" w ON u."WebsiteRoleID" = w."id"
       WHERE u."id" = $1 AND u."isActive" = true`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive.' });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      name: user.Name,
      email: user.Email,
      phone: user.Phone,
      role: user.Role,
      websiteRoleName: user.WebsiteRoleName,
      permissions: {
        viewAdmin:      user.viewAdmin      ?? false,
        removeUser:     user.removeUser     ?? false,
        addUser:        user.addUser        ?? false,
        markAttendance: user.markAttendance ?? false,
        assignTasks:    user.assignTasks    ?? false,
        updateSeva:     user.updateSeva     ?? false,
        addSeva:        user.addSeva        ?? false,
      },
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

// ── POST /api/auth/logout — client just deletes token ────────
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out.' });
});

export default router;
