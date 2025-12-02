-- CreateTable
CREATE TABLE "ReportWorkout" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportWorkout_reportId_idx" ON "ReportWorkout"("reportId");

-- CreateIndex
CREATE INDEX "ReportWorkout_workoutId_idx" ON "ReportWorkout"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportWorkout_reportId_workoutId_key" ON "ReportWorkout"("reportId", "workoutId");

-- AddForeignKey
ALTER TABLE "ReportWorkout" ADD CONSTRAINT "ReportWorkout_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportWorkout" ADD CONSTRAINT "ReportWorkout_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
