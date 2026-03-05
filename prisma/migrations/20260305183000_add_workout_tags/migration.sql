-- AlterTable
ALTER TABLE "Workout" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;

-- CreateIndex
CREATE INDEX "Workout_tags_idx" ON "Workout" USING GIN ("tags");
