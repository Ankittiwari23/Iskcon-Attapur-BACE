-- Seed: Demo user and reference data (run after schema.sql)

-- Member types
INSERT INTO "MemberType" ("MemberTypeName")
VALUES ('BYC'), ('DYC'), ('Brahmachari'), ('Temple President'), ('Devotee')
ON CONFLICT ("MemberTypeName") DO NOTHING;

-- Demo user: Ankit Tiwari (Admin, for development)
INSERT INTO "users" ("Name", "Role", "isBACEDevotee", "JoinedDate", "isActive", "MemberTypeID")
SELECT 'Ankit Tiwari', 'Admin', false, CURRENT_DATE, true, (SELECT "id" FROM "MemberType" WHERE "MemberTypeName" = 'BYC' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "Name" = 'Ankit Tiwari');

-- Sample class types (optional)
INSERT INTO "ClassType" ("ClassType", "currentActiveSession")
VALUES ('BYC', 1), ('DYC', 1), ('VaisnavaEtiquette', 1)
ON CONFLICT ("ClassType") DO NOTHING;
