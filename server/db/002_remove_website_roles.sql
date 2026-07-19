-- Migration 002: Remove Website Roles entirely (DESTRUCTIVE)
-- Access control now relies solely on users."Role" (Admin/Managers/Students).
-- Review before running. This drops the WebsiteRoleID column from users and
-- the WebsiteRoles table. Ensure the application code no longer references them
-- (Auth.js, users.js, client) before applying.

BEGIN;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_WebsiteRoleID_fkey";
ALTER TABLE "users" DROP COLUMN IF EXISTS "WebsiteRoleID";

DROP TABLE IF EXISTS "WebsiteRoles";

COMMIT;
