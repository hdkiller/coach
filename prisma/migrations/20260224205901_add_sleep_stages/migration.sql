-- AlterTable
ALTER TABLE "DailyMetric" ADD COLUMN     "sleepDeepSecs" INTEGER,
ADD COLUMN     "sleepLightSecs" INTEGER,
ADD COLUMN     "sleepRemSecs" INTEGER;

-- AlterTable
ALTER TABLE "Wellness" ADD COLUMN     "sleepDeepSecs" INTEGER,
ADD COLUMN     "sleepLightSecs" INTEGER,
ADD COLUMN     "sleepRemSecs" INTEGER;
