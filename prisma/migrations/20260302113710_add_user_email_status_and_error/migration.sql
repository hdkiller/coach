-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailStatus" TEXT NOT NULL DEFAULT 'VALID';
