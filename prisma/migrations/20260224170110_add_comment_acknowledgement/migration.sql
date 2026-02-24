-- AlterTable
ALTER TABLE "BugReportComment" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedBy" TEXT;
