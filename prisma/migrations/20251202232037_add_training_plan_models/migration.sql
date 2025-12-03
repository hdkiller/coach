-- CreateTable
CREATE TABLE "TrainingAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "morning" BOOLEAN NOT NULL DEFAULT false,
    "afternoon" BOOLEAN NOT NULL DEFAULT false,
    "evening" BOOLEAN NOT NULL DEFAULT false,
    "preferredTypes" JSONB,
    "indoorOnly" BOOLEAN NOT NULL DEFAULT false,
    "outdoorOnly" BOOLEAN NOT NULL DEFAULT false,
    "gymAccess" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "daysPlanned" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedBy" TEXT NOT NULL DEFAULT 'AI',
    "modelVersion" TEXT,
    "planJson" JSONB NOT NULL,
    "totalTSS" DOUBLE PRECISION,
    "totalDuration" INTEGER,
    "workoutCount" INTEGER,
    "userAccepted" BOOLEAN,
    "userModified" BOOLEAN,
    "appliedToIntervals" BOOLEAN DEFAULT false,
    "notes" TEXT,
    "adjustmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingAvailability_userId_idx" ON "TrainingAvailability"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAvailability_userId_dayOfWeek_key" ON "TrainingAvailability"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "WeeklyTrainingPlan_userId_weekStartDate_idx" ON "WeeklyTrainingPlan"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "WeeklyTrainingPlan_userId_status_idx" ON "WeeklyTrainingPlan"("userId", "status");

-- AddForeignKey
ALTER TABLE "TrainingAvailability" ADD CONSTRAINT "TrainingAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTrainingPlan" ADD CONSTRAINT "WeeklyTrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
