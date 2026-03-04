ALTER TABLE "User"
ADD COLUMN "weightSourceMode" TEXT NOT NULL DEFAULT 'AUTO';

CREATE TABLE "BodyMeasurementEntry" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "metricKey" TEXT NOT NULL,
    "displayName" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRefType" TEXT,
    "sourceRefId" TEXT,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyMeasurementEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BodyMeasurementEntry_userId_metricKey_recordedAt_idx"
ON "BodyMeasurementEntry"("userId", "metricKey", "recordedAt" DESC);

CREATE INDEX "BodyMeasurementEntry_userId_recordedAt_idx"
ON "BodyMeasurementEntry"("userId", "recordedAt" DESC);

ALTER TABLE "BodyMeasurementEntry"
ADD CONSTRAINT "BodyMeasurementEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
