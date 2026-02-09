-- AlterTable
ALTER TABLE "UserNutritionSettings" ADD COLUMN     "carbScalingFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "enabledSupplements" TEXT[] DEFAULT ARRAY[]::TEXT[];
