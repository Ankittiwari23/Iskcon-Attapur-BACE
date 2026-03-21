# ISKCON BYC – Student Management

Manage ISKCON students, class types, sessions, enrollments, and attendance.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Express (Node 20)
- **Database:** Neon Postgres (later migrable to Azure)

## Setup

### 1. Neon Postgres

1. Create a project at [Neon](https://neon.tech) and copy the connection string.
2. In the Neon SQL Editor, run the schema and seed:
   - Run `server/db/schema.sql`
   - Run `server/db/seed.sql` (creates demo user **Ankit Tiwari** and reference data)

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env and set DATABASE_URL to your Neon connection string
npm install
npm run dev
```

Server runs at `http://localhost:3001`.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173` and proxies `/api` to the backend.

## Features

- **Users:** CRUD for members (name, role, member type, website role, joined date, BACE devotee, active).
- **Member Types:** BYC, DYC, Brahmachari, Temple President, etc.
- **Website Roles:** Permissions (viewAdmin, addUser, markAttendance, etc.) for authorization (enforced later).
- **Class Types:** BYC, DYC, Vaisnava Etiquette, etc., with current active session.
- **Class Sessions:** Sessions per class type (SessionID auto-increments per type).
- **Classes:** Individual classes within a session (description, dates, duration, instructor).
- **Enrollments:** Enroll students in a class type + session.
- **Attendance:** Mark and view attendance per class for enrolled students.

Demo user for now: **Ankit Tiwari** (no real auth yet).
