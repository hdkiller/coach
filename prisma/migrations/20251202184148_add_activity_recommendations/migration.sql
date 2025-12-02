-- CreateTable
CREATE TABLE "ActivityRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "analysisJson" JSONB,
    "plannedWorkoutId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "modelVersion" TEXT,
    "userAccepted" BOOLEAN,
    "userModified" BOOLEAN,
    "appliedToIntervals" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityRecommendation_userId_date_idx" ON "ActivityRecommendation"("userId", "date");

-- AddForeignKey
ALTER TABLE "ActivityRecommendation" ADD CONSTRAINT "ActivityRecommendation_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRecommendation" ADD CONSTRAINT "ActivityRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
