-- AlterTable
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- This column might already exist in some environments due to drift, so we use a check if needed, 
-- but in dev we can just let it fail or wrap in a block. 
-- For a proper Prisma migration, we just write the intended state.
-- ALTER TABLE "SystemMessage" ADD COLUMN "minUserAgeDays" INTEGER NOT NULL DEFAULT 0;
