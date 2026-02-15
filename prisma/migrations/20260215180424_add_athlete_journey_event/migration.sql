-- CreateEnum
CREATE TYPE "JourneyEventType" AS ENUM ('SYMPTOM', 'WELLNESS_CHECK', 'RECOVERY_NOTE');

-- CreateEnum
CREATE TYPE "JourneyEventCategory" AS ENUM ('GI_DISTRESS', 'MUSCLE_PAIN', 'FATIGUE', 'SLEEP', 'MOOD', 'CRAMPING', 'DIZZINESS', 'HUNGER');

-- CreateTable
CREATE TABLE "AthleteJourneyEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "eventType" "JourneyEventType" NOT NULL,
    "category" "JourneyEventCategory" NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 5,
    "description" TEXT,
    "metabolicSnapshot" JSONB,
    "suspectedTriggerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteJourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteJourneyEvent_userId_timestamp_idx" ON "AthleteJourneyEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AthleteJourneyEvent_category_idx" ON "AthleteJourneyEvent"("category");

-- AddForeignKey
ALTER TABLE "AthleteJourneyEvent" ADD CONSTRAINT "AthleteJourneyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
