-- ISKCON Student Management - Neon Postgres Schema
-- Run this once against your Neon database (e.g. psql or Neon SQL Editor)

-- ========== USER / MEMBER TABLES ==========

CREATE TABLE IF NOT EXISTS "MemberType" (
  "id" SERIAL PRIMARY KEY,
  "MemberTypeName" VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "WebsiteRoles" (
  "id" SERIAL PRIMARY KEY,
  "Name" VARCHAR(50) NOT NULL UNIQUE,
  "viewAdmin" BOOLEAN DEFAULT false,
  "removeUser" BOOLEAN DEFAULT false,
  "addUser" BOOLEAN DEFAULT false,
  "markAttendance" BOOLEAN DEFAULT false,
  "assignTasks" BOOLEAN DEFAULT false,
  "updateSeva" BOOLEAN DEFAULT false,
  "addSeva" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS "IskconRoles" (
  "id" SERIAL PRIMARY KEY,
  "Designation" VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "Name" VARCHAR(200) NOT NULL,
  "Role" VARCHAR(50) NOT NULL CHECK ("Role" IN ('Admin', 'Managers', 'Students')),
  "isBACEDevotee" BOOLEAN DEFAULT false,
  "JoinedDate" DATE,
  "isActive" BOOLEAN DEFAULT true,
  "MemberTypeID" INTEGER REFERENCES "MemberType"("id"),
  "enrolledBY" INTEGER REFERENCES "users"("id"),
  "MentorID" INTEGER REFERENCES "users"("id"),
  "WebsiteRoleID" INTEGER REFERENCES "WebsiteRoles"("id"),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ========== CLASS TABLES ==========

CREATE TABLE IF NOT EXISTS "ClassType" (
  "id" SERIAL PRIMARY KEY,
  "ClassType" VARCHAR(100) NOT NULL UNIQUE,
  "currentActiveSession" INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "ClassSessions" (
  "id" SERIAL PRIMARY KEY,
  "ClassTypeID" INTEGER NOT NULL REFERENCES "ClassType"("id") ON DELETE CASCADE,
  "SessionID" INTEGER NOT NULL,
  "SessionName" VARCHAR(200) NOT NULL,
  "StartDate" DATE,
  "EndDate" DATE,
  "SessionIncharge" INTEGER REFERENCES "users"("id"),
  "TotalEnrolled" INTEGER DEFAULT 0,
  "TotalClasses" INTEGER DEFAULT 0,
  UNIQUE ("ClassTypeID", "SessionID")
);

CREATE TABLE IF NOT EXISTS "Classes" (
  "id" SERIAL PRIMARY KEY,
  "ClassTypeID" INTEGER NOT NULL REFERENCES "ClassType"("id") ON DELETE CASCADE,
  "SessionID" INTEGER NOT NULL,
  "ClassDescription" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "StartDate" DATE,
  "EndDate" DATE,
  "Duration" INTEGER,
  "DurationType" VARCHAR(20) CHECK ("DurationType" IN ('Permanent', 'Temporary', 'SingleDay')),
  "ClassInstructor" INTEGER REFERENCES "users"("id"),
  "Remarks" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SessionEnrollments" (
  "id" SERIAL PRIMARY KEY,
  "ClassTypeID" INTEGER NOT NULL REFERENCES "ClassType"("id") ON DELETE CASCADE,
  "SessionID" INTEGER NOT NULL,
  "userID" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "EnrolledByUserID" INTEGER REFERENCES "users"("id"),
  "StartDate" DATE,
  "EndDate" DATE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("ClassTypeID", "SessionID", "userID"),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClassAttendance" (
  "id" SERIAL PRIMARY KEY,
  "ClassID" INTEGER NOT NULL REFERENCES "Classes"("id") ON DELETE CASCADE,
  "ClassTypeID" INTEGER NOT NULL,
  "SessionID" INTEGER NOT NULL,
  "UserID" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "Attended" BOOLEAN NOT NULL DEFAULT false,
  "MarkedByUser" INTEGER REFERENCES "users"("id"),
  UNIQUE ("ClassID", "UserID"),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON "users"("Role");
CREATE INDEX IF NOT EXISTS idx_users_membertype ON "users"("MemberTypeID");
CREATE INDEX IF NOT EXISTS idx_classes_session ON "Classes"("ClassTypeID", "SessionID");
CREATE INDEX IF NOT EXISTS idx_session_enrollments_user ON "SessionEnrollments"("userID");
CREATE INDEX IF NOT EXISTS idx_attendance_class_user ON "ClassAttendance"("ClassID", "UserID");
