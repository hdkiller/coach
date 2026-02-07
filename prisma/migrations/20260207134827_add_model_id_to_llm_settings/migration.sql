-- AlterTable
ALTER TABLE "LlmOperationOverride" ADD COLUMN     "modelId" TEXT;

-- AlterTable
ALTER TABLE "LlmTierSettings" ADD COLUMN     "modelId" TEXT NOT NULL DEFAULT 'gemini-flash-latest';
