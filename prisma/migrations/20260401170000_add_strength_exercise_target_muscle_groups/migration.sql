ALTER TABLE "StrengthExerciseLibraryItem"
ADD COLUMN "targetMuscleGroups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
