-- AlterTable Workout - Add scoring fields for workout quality tracking
ALTER TABLE "Workout" ADD COLUMN "overallScore" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "technicalScore" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "effortScore" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "pacingScore" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "executionScore" INTEGER;

-- AlterTable Nutrition - Add scoring fields for nutrition quality tracking
ALTER TABLE "Nutrition" ADD COLUMN "overallScore" INTEGER;
ALTER TABLE "Nutrition" ADD COLUMN "macroBalanceScore" INTEGER;
ALTER TABLE "Nutrition" ADD COLUMN "qualityScore" INTEGER;
ALTER TABLE "Nutrition" ADD COLUMN "adherenceScore" INTEGER;
ALTER TABLE "Nutrition" ADD COLUMN "hydrationScore" INTEGER;

-- AlterTable Report - Add scoring fields for weekly/period assessments
ALTER TABLE "Report" ADD COLUMN "overallScore" INTEGER;
ALTER TABLE "Report" ADD COLUMN "trainingLoadScore" INTEGER;
ALTER TABLE "Report" ADD COLUMN "recoveryScore" INTEGER;
ALTER TABLE "Report" ADD COLUMN "progressScore" INTEGER;
ALTER TABLE "Report" ADD COLUMN "consistencyScore" INTEGER;

-- AlterTable User - Add scoring fields for athlete profile metrics
ALTER TABLE "User" ADD COLUMN "currentFitnessScore" INTEGER;
ALTER TABLE "User" ADD COLUMN "recoveryCapacityScore" INTEGER;
ALTER TABLE "User" ADD COLUMN "nutritionComplianceScore" INTEGER;
ALTER TABLE "User" ADD COLUMN "trainingConsistencyScore" INTEGER;
ALTER TABLE "User" ADD COLUMN "profileLastUpdated" TIMESTAMP(3);

-- Add check constraints to ensure scores are between 1-10
ALTER TABLE "Workout" ADD CONSTRAINT "workout_overall_score_range" CHECK ("overallScore" >= 1 AND "overallScore" <= 10);
ALTER TABLE "Workout" ADD CONSTRAINT "workout_technical_score_range" CHECK ("technicalScore" >= 1 AND "technicalScore" <= 10);
ALTER TABLE "Workout" ADD CONSTRAINT "workout_effort_score_range" CHECK ("effortScore" >= 1 AND "effortScore" <= 10);
ALTER TABLE "Workout" ADD CONSTRAINT "workout_pacing_score_range" CHECK ("pacingScore" >= 1 AND "pacingScore" <= 10);
ALTER TABLE "Workout" ADD CONSTRAINT "workout_execution_score_range" CHECK ("executionScore" >= 1 AND "executionScore" <= 10);

ALTER TABLE "Nutrition" ADD CONSTRAINT "nutrition_overall_score_range" CHECK ("overallScore" >= 1 AND "overallScore" <= 10);
ALTER TABLE "Nutrition" ADD CONSTRAINT "nutrition_macro_score_range" CHECK ("macroBalanceScore" >= 1 AND "macroBalanceScore" <= 10);
ALTER TABLE "Nutrition" ADD CONSTRAINT "nutrition_quality_score_range" CHECK ("qualityScore" >= 1 AND "qualityScore" <= 10);
ALTER TABLE "Nutrition" ADD CONSTRAINT "nutrition_adherence_score_range" CHECK ("adherenceScore" >= 1 AND "adherenceScore" <= 10);
ALTER TABLE "Nutrition" ADD CONSTRAINT "nutrition_hydration_score_range" CHECK ("hydrationScore" >= 1 AND "hydrationScore" <= 10);

ALTER TABLE "Report" ADD CONSTRAINT "report_overall_score_range" CHECK ("overallScore" >= 1 AND "overallScore" <= 10);
ALTER TABLE "Report" ADD CONSTRAINT "report_training_load_score_range" CHECK ("trainingLoadScore" >= 1 AND "trainingLoadScore" <= 10);
ALTER TABLE "Report" ADD CONSTRAINT "report_recovery_score_range" CHECK ("recoveryScore" >= 1 AND "recoveryScore" <= 10);
ALTER TABLE "Report" ADD CONSTRAINT "report_progress_score_range" CHECK ("progressScore" >= 1 AND "progressScore" <= 10);
ALTER TABLE "Report" ADD CONSTRAINT "report_consistency_score_range" CHECK ("consistencyScore" >= 1 AND "consistencyScore" <= 10);

ALTER TABLE "User" ADD CONSTRAINT "user_fitness_score_range" CHECK ("currentFitnessScore" >= 1 AND "currentFitnessScore" <= 10);
ALTER TABLE "User" ADD CONSTRAINT "user_recovery_capacity_score_range" CHECK ("recoveryCapacityScore" >= 1 AND "recoveryCapacityScore" <= 10);
ALTER TABLE "User" ADD CONSTRAINT "user_nutrition_compliance_score_range" CHECK ("nutritionComplianceScore" >= 1 AND "nutritionComplianceScore" <= 10);
ALTER TABLE "User" ADD CONSTRAINT "user_training_consistency_score_range" CHECK ("trainingConsistencyScore" >= 1 AND "trainingConsistencyScore" <= 10);

-- Create index for time-based score queries
CREATE INDEX "Workout_userId_date_overallScore_idx" ON "Workout"("userId", "date", "overallScore");
CREATE INDEX "Nutrition_userId_date_overallScore_idx" ON "Nutrition"("userId", "date", "overallScore");
CREATE INDEX "Report_userId_createdAt_overallScore_idx" ON "Report"("userId", "createdAt", "overallScore");