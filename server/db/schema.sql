-- ISKCON Student Management - Neon Postgres Schema
-- Run this once against your Neon database (e.g. psql or Neon SQL Editor)
-- This file is kept in sync with the live database.

-- ========== USER / MEMBER TABLES ==========

CREATE TABLE IF NOT EXISTS "MemberType" (
  "id" SERIAL PRIMARY KEY,
  "MemberTypeName" VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "IskconRoles" (
  "id" SERIAL PRIMARY KEY,
  "Designation" VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "Name" VARCHAR(200) NOT NULL,
  "Role" VARCHAR(50) NOT NULL CHECK ("Role" IN ('Admin', 'Managers', 'Students')),
  "Email" VARCHAR(200) UNIQUE,
  "Phone" VARCHAR(20),
  "PasswordHash" VARCHAR(255),
  "isBACEDevotee" BOOLEAN DEFAULT false,
  "JoinedDate" DATE,
  "isActive" BOOLEAN DEFAULT true,
  "MemberTypeID" INTEGER REFERENCES "MemberType"("id"),
  "enrolledBY" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "MentorID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
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
  "SessionIncharge" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
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
  "Duration" INTEGER DEFAULT 1,
  "DurationType" VARCHAR(20) DEFAULT 'SingleDay' CHECK ("DurationType" = 'SingleDay'),
  "ClassInstructor" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "Remarks" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SessionEnrollments" (
  "id" SERIAL PRIMARY KEY,
  "ClassTypeID" INTEGER NOT NULL REFERENCES "ClassType"("id") ON DELETE CASCADE,
  "SessionID" INTEGER NOT NULL,
  "userID" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "EnrolledByUserID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
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
  "MarkedByUser" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "MarkedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("ClassID", "UserID"),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

-- ========== ENROLLMENT INVITE TABLES ==========

CREATE TABLE IF NOT EXISTS "EnrollmentInvites" (
  "id" SERIAL PRIMARY KEY,
  "Token" VARCHAR(64) NOT NULL UNIQUE,
  "ClassTypeID" INTEGER NOT NULL REFERENCES "ClassType"("id") ON DELETE CASCADE,
  "SessionID" INTEGER NOT NULL,
  "CreatedByID" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ExpiresAt" TIMESTAMPTZ NOT NULL,
  "IsActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PendingEnrollments" (
  "id" SERIAL PRIMARY KEY,
  "InviteID" INTEGER NOT NULL REFERENCES "EnrollmentInvites"("id") ON DELETE CASCADE,
  "ClassTypeID" INTEGER NOT NULL,
  "SessionID" INTEGER NOT NULL,
  "Name" VARCHAR(200) NOT NULL,
  "Age" INTEGER,
  "Email" VARCHAR(200),
  "Phone" VARCHAR(20),
  "Status" VARCHAR(20) DEFAULT 'pending' CHECK ("Status" IN ('pending', 'approved', 'rejected')),
  "ReviewedByID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "ReviewedAt" TIMESTAMPTZ,
  "UserID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

-- ========== FOLLOW-UP TABLES ==========

CREATE TABLE IF NOT EXISTS "FollowUps" (
  "id" SERIAL PRIMARY KEY,
  "ClassID" INTEGER NOT NULL REFERENCES "Classes"("id") ON DELETE CASCADE,
  "ClassTypeID" INTEGER NOT NULL,
  "SessionID" INTEGER NOT NULL,
  "StudentID" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "MentorID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "Status" VARCHAR(30) NOT NULL DEFAULT 'no_response'
    CHECK ("Status" IN ('no_response', 'call_not_attended', 'denied', 'confirmed')),
  "Response" TEXT,
  "AttendedResult" VARCHAR(20) CHECK ("AttendedResult" IN ('attended', 'missed')),
  "UpdatedByID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("ClassID", "StudentID"),
  FOREIGN KEY ("ClassTypeID", "SessionID") REFERENCES "ClassSessions"("ClassTypeID", "SessionID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserSignals" (
  "id" SERIAL PRIMARY KEY,
  "UserID" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
  "Signal" VARCHAR(10) NOT NULL DEFAULT 'green'
    CHECK ("Signal" IN ('green', 'yellow', 'orange', 'red')),
  "IsInFollowUpList" BOOLEAN DEFAULT true,
  "UpdatedByID" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON "users"("Role");
CREATE INDEX IF NOT EXISTS idx_users_membertype ON "users"("MemberTypeID");
CREATE INDEX IF NOT EXISTS idx_users_email ON "users"("Email");
CREATE INDEX IF NOT EXISTS idx_classes_session ON "Classes"("ClassTypeID", "SessionID");
CREATE INDEX IF NOT EXISTS idx_session_enrollments_user ON "SessionEnrollments"("userID");
CREATE INDEX IF NOT EXISTS idx_attendance_class_user ON "ClassAttendance"("ClassID", "UserID");
CREATE INDEX IF NOT EXISTS idx_invite_token ON "EnrollmentInvites"("Token");
CREATE INDEX IF NOT EXISTS idx_pending_status ON "PendingEnrollments"("Status");
CREATE INDEX IF NOT EXISTS idx_pending_invite ON "PendingEnrollments"("InviteID");
CREATE INDEX IF NOT EXISTS idx_followups_class ON "FollowUps"("ClassID");
CREATE INDEX IF NOT EXISTS idx_followups_student ON "FollowUps"("StudentID");
CREATE INDEX IF NOT EXISTS idx_followups_mentor ON "FollowUps"("MentorID");
CREATE INDEX IF NOT EXISTS idx_followups_session ON "FollowUps"("ClassTypeID", "SessionID");
