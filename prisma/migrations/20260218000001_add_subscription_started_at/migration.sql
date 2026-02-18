-- Add subscriptionStartedAt to User
ALTER TABLE "User" ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3);

-- Add NEED_MORE_INFO to BugStatus enum if it doesn't exist
-- Note: PostgreSQL enums are modified using ALTER TYPE
ALTER TYPE "BugStatus" ADD VALUE IF NOT EXISTS 'NEED_MORE_INFO';
