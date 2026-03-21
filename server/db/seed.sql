-- Seed: Demo user and reference data (run after schema.sql)

-- Website roles for authorization
INSERT INTO "WebsiteRoles" ("Name", "viewAdmin", "removeUser", "addUser", "markAttendance", "assignTasks", "updateSeva", "addSeva")
VALUES
  ('Admin', true, true, true, true, true, true, true),
  ('Managers', true, false, true, true, true, true, false),
  ('Students', false, false, false, false, false, false, false)
ON CONFLICT ("Name") DO NOTHING;

-- Member types
INSERT INTO "MemberType" ("MemberTypeName")
VALUES ('BYC'), ('DYC'), ('Brahmachari'), ('Temple President'), ('Devotee')
ON CONFLICT ("MemberTypeName") DO NOTHING;

-- Demo user: Ankit Tiwari (Admin, for development)
INSERT INTO "users" ("Name", "Role", "isBACEDevotee", "JoinedDate", "isActive", "MemberTypeID", "WebsiteRoleID")
SELECT 'Ankit Tiwari', 'Admin', false, CURRENT_DATE, true, (SELECT "id" FROM "MemberType" WHERE "MemberTypeName" = 'BYC' LIMIT 1), (SELECT "id" FROM "WebsiteRoles" WHERE "Name" = 'Admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "Name" = 'Ankit Tiwari');

-- Sample class types (optional)
INSERT INTO "ClassType" ("ClassType", "currentActiveSession")
VALUES ('BYC', 1), ('DYC', 1), ('VaisnavaEtiquette', 1)
ON CONFLICT ("ClassType") DO NOTHING;
