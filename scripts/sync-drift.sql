-- SQL Migration to sync production database with local schema

-- 1. Create ApiKey table
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey"("key");
CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX IF NOT EXISTS "ApiKey_key_idx" ON "ApiKey"("key");

ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Update User table
-- Add altitude column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "altitude" INTEGER;

-- Fix boolean defaults (optional, but good for consistency)
ALTER TABLE "User" ALTER COLUMN "aiAutoAnalyzeNutrition" SET DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "aiAutoAnalyzeWorkouts" SET DEFAULT false;

-- Note: The NULL vs NOT NULL for boolean defaults might require data migration if nulls exist
-- UPDATE "User" SET "aiAutoAnalyzeNutrition" = false WHERE "aiAutoAnalyzeNutrition" IS NULL;
-- ALTER TABLE "User" ALTER COLUMN "aiAutoAnalyzeNutrition" SET NOT NULL;
-- UPDATE "User" SET "aiAutoAnalyzeWorkouts" = false WHERE "aiAutoAnalyzeWorkouts" IS NULL;
-- ALTER TABLE "User" ALTER COLUMN "aiAutoAnalyzeWorkouts" SET NOT NULL;


-- 3. Update Workout table
-- Add missing unique index on shareToken
CREATE UNIQUE INDEX IF NOT EXISTS "Workout_shareToken_key" ON "Workout"("shareToken");

