/*
  Warnings:

  - You are about to drop the column `if` on the `Workout` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Workout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Workout" DROP COLUMN "if",
ADD COLUMN     "atl" DOUBLE PRECISION,
ADD COLUMN     "averageCadence" INTEGER,
ADD COLUMN     "averageSpeed" DOUBLE PRECISION,
ADD COLUMN     "avgTemp" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ctl" DOUBLE PRECISION,
ADD COLUMN     "decoupling" DOUBLE PRECISION,
ADD COLUMN     "efficiencyFactor" DOUBLE PRECISION,
ADD COLUMN     "feel" INTEGER,
ADD COLUMN     "ftp" INTEGER,
ADD COLUMN     "intensity" DOUBLE PRECISION,
ADD COLUMN     "lrBalance" DOUBLE PRECISION,
ADD COLUMN     "maxCadence" INTEGER,
ADD COLUMN     "polarizationIndex" DOUBLE PRECISION,
ADD COLUMN     "powerHrRatio" DOUBLE PRECISION,
ADD COLUMN     "rpe" INTEGER,
ADD COLUMN     "sessionRpe" INTEGER,
ADD COLUMN     "trainer" BOOLEAN,
ADD COLUMN     "trainingLoad" DOUBLE PRECISION,
ADD COLUMN     "trimp" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "variabilityIndex" DOUBLE PRECISION,
ADD COLUMN     "weightedAvgWatts" INTEGER;

-- CreateTable
CREATE TABLE "Wellness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hrv" DOUBLE PRECISION,
    "hrvSdnn" DOUBLE PRECISION,
    "restingHr" INTEGER,
    "avgSleepingHr" INTEGER,
    "sleepSecs" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "sleepScore" INTEGER,
    "sleepQuality" INTEGER,
    "readiness" INTEGER,
    "recoveryScore" INTEGER,
    "soreness" INTEGER,
    "fatigue" INTEGER,
    "stress" INTEGER,
    "mood" INTEGER,
    "motivation" INTEGER,
    "weight" DOUBLE PRECISION,
    "spO2" DOUBLE PRECISION,
    "ctl" DOUBLE PRECISION,
    "atl" DOUBLE PRECISION,
    "comments" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wellness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wellness_userId_date_idx" ON "Wellness"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Wellness_userId_date_key" ON "Wellness"("userId", "date");

-- AddForeignKey
ALTER TABLE "Wellness" ADD CONSTRAINT "Wellness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
