-- CreateTable
CREATE TABLE "PlannedWorkoutPublishTarget" (
    "id" TEXT NOT NULL,
    "plannedWorkoutId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "scheduleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedWorkoutPublishTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedWorkoutPublishTarget_provider_externalId_idx" ON "PlannedWorkoutPublishTarget"("provider", "externalId");

-- CreateIndex
CREATE INDEX "PlannedWorkoutPublishTarget_status_idx" ON "PlannedWorkoutPublishTarget"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedWorkoutPublishTarget_plannedWorkoutId_provider_key" ON "PlannedWorkoutPublishTarget"("plannedWorkoutId", "provider");

-- AddForeignKey
ALTER TABLE "PlannedWorkoutPublishTarget" ADD CONSTRAINT "PlannedWorkoutPublishTarget_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
