-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "Nutrition" ADD COLUMN     "fuelingPlan" JSONB,
ADD COLUMN     "isManualLock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourcePrecedence" TEXT;

-- AlterTable
ALTER TABLE "PlannedWorkout" ADD COLUMN     "fuelingStrategy" TEXT;

-- AlterTable
ALTER TABLE "TrainingAvailability" ADD COLUMN     "slots" JSONB;

-- CreateTable
CREATE TABLE "UserNutritionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bmr" INTEGER,
    "activityLevel" TEXT,
    "baseProteinPerKg" DOUBLE PRECISION NOT NULL DEFAULT 1.6,
    "baseFatPerKg" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "currentCarbMax" INTEGER NOT NULL DEFAULT 60,
    "ultimateCarbGoal" INTEGER NOT NULL DEFAULT 90,
    "sweatRate" DOUBLE PRECISION,
    "sodiumTarget" INTEGER NOT NULL DEFAULT 750,
    "preWorkoutWindow" INTEGER NOT NULL DEFAULT 120,
    "postWorkoutWindow" INTEGER NOT NULL DEFAULT 60,
    "carbsPerHourLow" INTEGER NOT NULL DEFAULT 30,
    "carbsPerHourMedium" INTEGER NOT NULL DEFAULT 60,
    "carbsPerHourHigh" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNutritionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatRoomId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" JSONB,
    "logs" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNutritionSettings_userId_key" ON "UserNutritionSettings"("userId");

-- CreateIndex
CREATE INDEX "BugReport_userId_idx" ON "BugReport"("userId");

-- CreateIndex
CREATE INDEX "BugReport_chatRoomId_idx" ON "BugReport"("chatRoomId");

-- CreateIndex
CREATE INDEX "BugReport_status_idx" ON "BugReport"("status");

-- AddForeignKey
ALTER TABLE "UserNutritionSettings" ADD CONSTRAINT "UserNutritionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
