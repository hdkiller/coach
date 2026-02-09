-- AlterTable
ALTER TABLE "UserNutritionSettings" ADD COLUMN     "lifestyleExclusions" TEXT[] DEFAULT ARRAY[]::TEXT[];
