-- CreateEnum
CREATE TYPE "TeamVisibility" AS ENUM ('COACHES_ONLY', 'TEAMMATES');

-- AlterTable
ALTER TABLE "TeamInvite" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamVisibility" "TeamVisibility" DEFAULT 'COACHES_ONLY';

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AthleteGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
