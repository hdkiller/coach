/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `TrainingPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PlannedWorkout" ADD COLUMN     "dayIndex" INTEGER,
ADD COLUMN     "weekIndex" INTEGER;

-- AlterTable
ALTER TABLE "TrainingBlock" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "difficulty" INTEGER DEFAULT 5,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPlan_slug_key" ON "TrainingPlan"("slug");

-- CreateIndex
CREATE INDEX "TrainingPlan_isPublic_idx" ON "TrainingPlan"("isPublic");

-- CreateIndex
CREATE INDEX "TrainingPlan_slug_idx" ON "TrainingPlan"("slug");
