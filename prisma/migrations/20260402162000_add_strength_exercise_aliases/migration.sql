ALTER TABLE "StrengthExerciseLibraryItem"
ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
