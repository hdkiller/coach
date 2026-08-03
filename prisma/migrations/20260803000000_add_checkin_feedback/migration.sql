CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "personalChallenges" TEXT,
    "personalGoals" TEXT,
    "personalHighlights" TEXT,
    "personalNotes" TEXT,
    "wellnessInjury" TEXT,
    "wellnessPain" TEXT,
    "personalFatigue" INTEGER,
    "trainingDifficulty" INTEGER,
    "trainingHydration" INTEGER,
    "trainingLoad" INTEGER,
    "trainingNutrition" INTEGER,
    "trainingRecovery" INTEGER,
    "wellnessSleep" INTEGER,
    "wellnessStress" INTEGER,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachFeedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInId" TEXT,
    "komodoUrl" TEXT,
    "coachNotes" TEXT,

    CONSTRAINT "CoachFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");
CREATE INDEX "CoachFeedback_userId_idx" ON "CoachFeedback"("userId");
CREATE INDEX "CoachFeedback_checkInId_idx" ON "CoachFeedback"("checkInId");

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
