ALTER TABLE "User"
ALTER COLUMN "aiMemoryEnabled" SET DEFAULT false;

UPDATE "User"
SET "aiMemoryEnabled" = false
WHERE "aiMemoryEnabled" = true;
