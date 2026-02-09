-- AlterTable
ALTER TABLE "UserNutritionSettings" ADD COLUMN     "foodAllergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "foodIntolerances" TEXT[] DEFAULT ARRAY[]::TEXT[];
