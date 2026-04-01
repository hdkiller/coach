-- CreateTable
CREATE TABLE "StrengthExerciseLibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intent" TEXT,
    "movementPattern" TEXT,
    "notes" TEXT,
    "videoUrl" TEXT,
    "sets" INTEGER,
    "reps" TEXT,
    "weight" TEXT,
    "duration" INTEGER,
    "rest" TEXT,
    "rpe" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthExerciseLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrengthExerciseLibraryItem_userId_idx" ON "StrengthExerciseLibraryItem"("userId");

-- CreateIndex
CREATE INDEX "StrengthExerciseLibraryItem_userId_updatedAt_idx" ON "StrengthExerciseLibraryItem"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "StrengthExerciseLibraryItem" ADD CONSTRAINT "StrengthExerciseLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
