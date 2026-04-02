DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'StrengthExerciseLibraryItem'
      AND column_name = 'targetMuscleGroups'
  ) THEN
    ALTER TABLE "StrengthExerciseLibraryItem"
    ALTER COLUMN "targetMuscleGroups" DROP DEFAULT;
  END IF;
END $$;
