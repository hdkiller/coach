-- AlterTable
ALTER TABLE "StrengthExerciseLibraryItem"
ADD COLUMN "prescriptionMode" TEXT,
ADD COLUMN "loadMode" TEXT,
ADD COLUMN "defaultRest" TEXT,
ADD COLUMN "setRows" JSONB;
