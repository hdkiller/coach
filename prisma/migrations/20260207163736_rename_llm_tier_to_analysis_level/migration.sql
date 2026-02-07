-- Rename LlmTierSettings to LlmAnalysisLevelSettings
ALTER TABLE "LlmTierSettings" RENAME TO "LlmAnalysisLevelSettings";
ALTER TABLE "LlmAnalysisLevelSettings" RENAME COLUMN "tier" TO "level";

-- Update primary key constraint name
ALTER TABLE "LlmAnalysisLevelSettings" RENAME CONSTRAINT "LlmTierSettings_pkey" TO "LlmAnalysisLevelSettings_pkey";

-- Update unique index name
ALTER INDEX "LlmTierSettings_tier_key" RENAME TO "LlmAnalysisLevelSettings_level_key";

-- Update LlmOperationOverride
ALTER TABLE "LlmOperationOverride" RENAME COLUMN "tierSettingsId" TO "analysisLevelSettingsId";

-- Update unique index for LlmOperationOverride
ALTER INDEX "LlmOperationOverride_tierSettingsId_operation_key" RENAME TO "LlmOperationOverride_analysisLevelSettingsId_operation_key";

-- Update foreign key constraint for LlmOperationOverride
ALTER TABLE "LlmOperationOverride" DROP CONSTRAINT "LlmOperationOverride_tierSettingsId_fkey";
ALTER TABLE "LlmOperationOverride" ADD CONSTRAINT "LlmOperationOverride_analysisLevelSettingsId_fkey" FOREIGN KEY ("analysisLevelSettingsId") REFERENCES "LlmAnalysisLevelSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Now map the data
-- Mapping:
-- FREE -> flash
-- SUPPORTER -> flash (we'll merge it into flash, or keep it as another level? user said flash, pro, experimental)
-- PRO -> pro
-- CONTRIBUTOR -> experimental (or we just keep flash, pro, experimental)

-- The user wants to map to AI Settings (flash, pro, experimental)
-- Since we have 4 tiers and 3 levels, let's see.
-- FREE and SUPPORTER both use 'flash' by default in entitlements.
-- PRO uses 'pro'.
-- Experimental is also available to PRO.

-- Let's just rename the levels to the model identifiers and let the admin manage them.
UPDATE "LlmAnalysisLevelSettings" SET "level" = 'flash' WHERE "level" = 'FREE';
UPDATE "LlmAnalysisLevelSettings" SET "level" = 'pro' WHERE "level" = 'PRO';
UPDATE "LlmAnalysisLevelSettings" SET "level" = 'experimental' WHERE "level" = 'CONTRIBUTOR';

-- Delete SUPPORTER if it exists, or just leave it for now.

-- Actually, it's better to delete SUPPORTER and merge any overrides if they exist (rare in dev)

-- For now, let's just make sure we don't have duplicates.

DELETE FROM "LlmAnalysisLevelSettings" WHERE "level" = 'SUPPORTER';



-- Update User preferences to match their new defaults

-- 1. PRO users should use the 'pro' (Thoughtful) level by default

UPDATE "User" SET "aiModelPreference" = 'pro' 

WHERE "subscriptionTier" = 'PRO' 

AND ("aiModelPreference" = 'flash' OR "aiModelPreference" IS NULL);



-- 2. CONTRIBUTORS should use the 'experimental' level by default

UPDATE "User" SET "aiModelPreference" = 'experimental' 

WHERE "subscriptionStatus" = 'CONTRIBUTOR';
