-- AlterTable
ALTER TABLE "WorkoutStream" ADD COLUMN     "hrv" JSONB,
ADD COLUMN     "leftRightBalance" JSONB,
ADD COLUMN     "respiration" JSONB,
ADD COLUMN     "temp" JSONB,
ADD COLUMN     "torque" JSONB;
