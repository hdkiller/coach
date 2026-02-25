-- AlterTable
ALTER TABLE "UserNutritionSettings"
ADD COLUMN "baseCaloriesMode" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN "nonExerciseBaseCalories" INTEGER;
