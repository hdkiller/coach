-- AlterTable
ALTER TABLE "LlmAnalysisLevelSettings" ALTER COLUMN "modelId" SET DEFAULT 'gemini-2.5-flash';

-- Update existing records
UPDATE "LlmAnalysisLevelSettings" SET "modelId" = 'gemini-2.5-flash' WHERE "modelId" = 'gemini-2.5-flash-preview-09-2025';
UPDATE "LlmOperationOverride" SET "modelId" = 'gemini-2.5-flash' WHERE "modelId" = 'gemini-2.5-flash-preview-09-2025';
