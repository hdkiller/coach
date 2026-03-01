-- CreateTable
CREATE TABLE "MetricHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "oldValue" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workoutId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricHistory_userId_idx" ON "MetricHistory"("userId");

-- CreateIndex
CREATE INDEX "MetricHistory_type_idx" ON "MetricHistory"("type");

-- CreateIndex
CREATE INDEX "MetricHistory_date_idx" ON "MetricHistory"("date");

-- AddForeignKey
ALTER TABLE "MetricHistory" ADD CONSTRAINT "MetricHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricHistory" ADD CONSTRAINT "MetricHistory_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
