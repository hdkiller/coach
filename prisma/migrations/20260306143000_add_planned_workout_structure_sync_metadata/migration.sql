-- Add metadata to protect locally edited planned workout structures from stale remote overwrites
ALTER TABLE "PlannedWorkout"
ADD COLUMN "lastStructureEditedAt" TIMESTAMP(3),
ADD COLUMN "lastStructureEditSource" TEXT,
ADD COLUMN "lastStructurePublishedAt" TIMESTAMP(3),
ADD COLUMN "lastRemoteStructureSeenAt" TIMESTAMP(3),
ADD COLUMN "structureHash" TEXT,
ADD COLUMN "remoteStructureHash" TEXT,
ADD COLUMN "syncConflict" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pendingRemoteStructuredWorkout" JSONB;
