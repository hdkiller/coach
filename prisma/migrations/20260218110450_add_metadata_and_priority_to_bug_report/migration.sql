-- AlterTable
ALTER TABLE "BugReport" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" TEXT DEFAULT 'MEDIUM';
