-- Migration 001: Make staff-reference foreign keys ON DELETE SET NULL
-- Fixes the "delete user" failure when a user is referenced as a mentor,
-- instructor, incharge, enroller, reviewer, etc. After this migration a
-- referenced user can be deleted and the referencing column becomes NULL.
--
-- Safe to run multiple times: each block drops the existing constraint
-- (by its default name) and recreates it with ON DELETE SET NULL.

BEGIN;

-- users.enrolledBY -> users.id
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_enrolledBY_fkey";
ALTER TABLE "users"
  ADD CONSTRAINT "users_enrolledBY_fkey"
  FOREIGN KEY ("enrolledBY") REFERENCES "users"("id") ON DELETE SET NULL;

-- users.MentorID -> users.id
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_MentorID_fkey";
ALTER TABLE "users"
  ADD CONSTRAINT "users_MentorID_fkey"
  FOREIGN KEY ("MentorID") REFERENCES "users"("id") ON DELETE SET NULL;

-- ClassSessions.SessionIncharge -> users.id
ALTER TABLE "ClassSessions" DROP CONSTRAINT IF EXISTS "ClassSessions_SessionIncharge_fkey";
ALTER TABLE "ClassSessions"
  ADD CONSTRAINT "ClassSessions_SessionIncharge_fkey"
  FOREIGN KEY ("SessionIncharge") REFERENCES "users"("id") ON DELETE SET NULL;

-- Classes.ClassInstructor -> users.id
ALTER TABLE "Classes" DROP CONSTRAINT IF EXISTS "Classes_ClassInstructor_fkey";
ALTER TABLE "Classes"
  ADD CONSTRAINT "Classes_ClassInstructor_fkey"
  FOREIGN KEY ("ClassInstructor") REFERENCES "users"("id") ON DELETE SET NULL;

-- SessionEnrollments.EnrolledByUserID -> users.id
ALTER TABLE "SessionEnrollments" DROP CONSTRAINT IF EXISTS "SessionEnrollments_EnrolledByUserID_fkey";
ALTER TABLE "SessionEnrollments"
  ADD CONSTRAINT "SessionEnrollments_EnrolledByUserID_fkey"
  FOREIGN KEY ("EnrolledByUserID") REFERENCES "users"("id") ON DELETE SET NULL;

-- ClassAttendance.MarkedByUser -> users.id
ALTER TABLE "ClassAttendance" DROP CONSTRAINT IF EXISTS "ClassAttendance_MarkedByUser_fkey";
ALTER TABLE "ClassAttendance"
  ADD CONSTRAINT "ClassAttendance_MarkedByUser_fkey"
  FOREIGN KEY ("MarkedByUser") REFERENCES "users"("id") ON DELETE SET NULL;

-- FollowUps.MentorID -> users.id
ALTER TABLE "FollowUps" DROP CONSTRAINT IF EXISTS "FollowUps_MentorID_fkey";
ALTER TABLE "FollowUps"
  ADD CONSTRAINT "FollowUps_MentorID_fkey"
  FOREIGN KEY ("MentorID") REFERENCES "users"("id") ON DELETE SET NULL;

-- FollowUps.UpdatedByID -> users.id
ALTER TABLE "FollowUps" DROP CONSTRAINT IF EXISTS "FollowUps_UpdatedByID_fkey";
ALTER TABLE "FollowUps"
  ADD CONSTRAINT "FollowUps_UpdatedByID_fkey"
  FOREIGN KEY ("UpdatedByID") REFERENCES "users"("id") ON DELETE SET NULL;

-- UserSignals.UpdatedByID -> users.id
ALTER TABLE "UserSignals" DROP CONSTRAINT IF EXISTS "UserSignals_UpdatedByID_fkey";
ALTER TABLE "UserSignals"
  ADD CONSTRAINT "UserSignals_UpdatedByID_fkey"
  FOREIGN KEY ("UpdatedByID") REFERENCES "users"("id") ON DELETE SET NULL;

-- EnrollmentInvites.CreatedByID -> users.id
ALTER TABLE "EnrollmentInvites" DROP CONSTRAINT IF EXISTS "EnrollmentInvites_CreatedByID_fkey";
ALTER TABLE "EnrollmentInvites"
  ADD CONSTRAINT "EnrollmentInvites_CreatedByID_fkey"
  FOREIGN KEY ("CreatedByID") REFERENCES "users"("id") ON DELETE CASCADE;

-- PendingEnrollments.ReviewedByID -> users.id
ALTER TABLE "PendingEnrollments" DROP CONSTRAINT IF EXISTS "PendingEnrollments_ReviewedByID_fkey";
ALTER TABLE "PendingEnrollments"
  ADD CONSTRAINT "PendingEnrollments_ReviewedByID_fkey"
  FOREIGN KEY ("ReviewedByID") REFERENCES "users"("id") ON DELETE SET NULL;

-- PendingEnrollments.UserID -> users.id
ALTER TABLE "PendingEnrollments" DROP CONSTRAINT IF EXISTS "PendingEnrollments_UserID_fkey";
ALTER TABLE "PendingEnrollments"
  ADD CONSTRAINT "PendingEnrollments_UserID_fkey"
  FOREIGN KEY ("UserID") REFERENCES "users"("id") ON DELETE SET NULL;

COMMIT;
