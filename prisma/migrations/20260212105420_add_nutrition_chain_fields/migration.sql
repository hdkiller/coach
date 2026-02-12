-- AlterTable
ALTER TABLE "Nutrition" ADD COLUMN     "isChainValid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startingFluidDeficit" DOUBLE PRECISION,
ADD COLUMN     "startingGlycogenPercentage" DOUBLE PRECISION;
