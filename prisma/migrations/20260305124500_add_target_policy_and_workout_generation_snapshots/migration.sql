-- AlterTable
ALTER TABLE "SportSettings"
ADD COLUMN "targetPolicy" JSONB;

-- AlterTable
ALTER TABLE "PlannedWorkout"
ADD COLUMN "createdFromSettingsSnapshot" JSONB,
ADD COLUMN "lastGenerationSettingsSnapshot" JSONB,
ADD COLUMN "lastGenerationContext" JSONB;
