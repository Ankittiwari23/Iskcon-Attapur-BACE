// server/index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db/pool.js';

import authRouter               from './routes/Auth.js';
import usersRouter              from './routes/users.js';
import memberTypesRouter        from './routes/memberTypes.js';
import websiteRolesRouter       from './routes/websiteRoles.js';
import iskconRolesRouter        from './routes/iskconRoles.js';
import classTypesRouter         from './routes/classTypes.js';
import classSessionsRouter      from './routes/classSessions.js';
import classesRouter            from './routes/classes.js';
import sessionEnrollmentsRouter from './routes/sessionEnrollments.js';
import classAttendanceRouter    from './routes/classAttendance.js';
import enrollmentInvitesRouter  from './routes/enrollmentInvites.js';

import { authenticate } from './middleware/Authenticate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

// ── Public routes (no auth needed) ───────────────────────────
app.use('/api/auth',               authRouter);
app.use('/api/enrollment-invites', enrollmentInvitesRouter); // has per-route auth on protected endpoints
app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Protected routes (JWT required) ──────────────────────────
app.use(authenticate);

app.use('/api/users',               usersRouter);
app.use('/api/member-types',        memberTypesRouter);
app.use('/api/website-roles',       websiteRolesRouter);
app.use('/api/iskcon-roles',        iskconRolesRouter);
app.use('/api/class-types',         classTypesRouter);
app.use('/api/class-sessions',      classSessionsRouter);
app.use('/api/classes',             classesRouter);
app.use('/api/session-enrollments', sessionEnrollmentsRouter);
app.use('/api/class-attendance',    classAttendanceRouter);

// ── Serve React frontend in production ───────────────────────
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Database connected.');
  } catch (e) {
    console.error('Database connection failed:', e.message);
  }
});