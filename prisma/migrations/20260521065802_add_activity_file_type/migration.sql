-- CreateEnum
CREATE TYPE "ActivityFileType" AS ENUM ('FIT', 'GPX', 'TCX');

-- AlterTable
ALTER TABLE "FitFile" ADD COLUMN     "fileType" "ActivityFileType" NOT NULL DEFAULT 'FIT';
