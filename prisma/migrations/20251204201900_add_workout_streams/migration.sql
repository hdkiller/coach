-- CreateTable
CREATE TABLE "WorkoutStream" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "time" JSONB,
    "distance" JSONB,
    "velocity" JSONB,
    "heartrate" JSONB,
    "cadence" JSONB,
    "watts" JSONB,
    "altitude" JSONB,
    "latlng" JSONB,
    "grade" JSONB,
    "moving" JSONB,
    "avgPacePerKm" DOUBLE PRECISION,
    "paceVariability" DOUBLE PRECISION,
    "lapSplits" JSONB,
    "paceZones" JSONB,
    "pacingStrategy" JSONB,
    "surges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutStream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutStream_workoutId_key" ON "WorkoutStream"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutStream_workoutId_idx" ON "WorkoutStream"("workoutId");

-- AddForeignKey
ALTER TABLE "WorkoutStream" ADD CONSTRAINT "WorkoutStream_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
