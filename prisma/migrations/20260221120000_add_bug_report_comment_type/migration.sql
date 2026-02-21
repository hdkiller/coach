-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('NOTE', 'MESSAGE');

-- AlterTable
ALTER TABLE "BugReportComment" ADD COLUMN "type" "CommentType" NOT NULL DEFAULT 'MESSAGE';
