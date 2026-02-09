-- AlterTable
ALTER TABLE "UserNutritionSettings" ADD COLUMN     "dietaryProfile" TEXT[] DEFAULT ARRAY[]::TEXT[];
