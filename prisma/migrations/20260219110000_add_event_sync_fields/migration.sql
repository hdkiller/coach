-- AlterTable
ALTER TABLE "Event" ADD COLUMN "syncError" TEXT, ADD COLUMN "syncStatus" TEXT DEFAULT 'SYNCED';
