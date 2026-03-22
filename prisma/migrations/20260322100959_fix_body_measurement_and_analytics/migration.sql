-- AlterTable
ALTER TABLE "BodyMeasurementEntry" ADD COLUMN     "customMetrics" JSONB DEFAULT '{}',
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
