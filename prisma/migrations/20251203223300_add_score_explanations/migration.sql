-- Add explanation fields for User (Athlete Profile) scores
ALTER TABLE "User" 
  ADD COLUMN "currentFitnessExplanation" TEXT,
  ADD COLUMN "recoveryCapacityExplanation" TEXT,
  ADD COLUMN "nutritionComplianceExplanation" TEXT,
  ADD COLUMN "trainingConsistencyExplanation" TEXT;

-- Add explanation fields for Workout scores
ALTER TABLE "Workout" 
  ADD COLUMN "overallQualityExplanation" TEXT,
  ADD COLUMN "technicalExecutionExplanation" TEXT,
  ADD COLUMN "effortManagementExplanation" TEXT,
  ADD COLUMN "pacingStrategyExplanation" TEXT,
  ADD COLUMN "executionConsistencyExplanation" TEXT;

-- Add explanation fields for Nutrition scores
ALTER TABLE "Nutrition" 
  ADD COLUMN "nutritionalBalanceExplanation" TEXT,
  ADD COLUMN "calorieAdherenceExplanation" TEXT,
  ADD COLUMN "macroDistributionExplanation" TEXT,
  ADD COLUMN "hydrationStatusExplanation" TEXT,
  ADD COLUMN "timingOptimizationExplanation" TEXT;

-- Add explanation fields for Report scores
ALTER TABLE "Report" 
  ADD COLUMN "trainingLoadExplanation" TEXT,
  ADD COLUMN "recoveryBalanceExplanation" TEXT,
  ADD COLUMN "progressTrendExplanation" TEXT,
  ADD COLUMN "adaptationReadinessExplanation" TEXT,
  ADD COLUMN "injuryRiskExplanation" TEXT;