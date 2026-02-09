-- AlterTable
ALTER TABLE "UserNutritionSettings" ADD COLUMN     "goalProfile" TEXT NOT NULL DEFAULT 'MAINTAIN',
ADD COLUMN     "mealPattern" JSONB;
