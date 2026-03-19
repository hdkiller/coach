ALTER TABLE "User"
ADD COLUMN "publicAuthorSlug" TEXT,
ADD COLUMN "publicDisplayName" TEXT,
ADD COLUMN "publicBio" TEXT,
ADD COLUMN "publicLocation" TEXT,
ADD COLUMN "publicWebsiteUrl" TEXT,
ADD COLUMN "publicSocialLinks" JSONB,
ADD COLUMN "publicCoachingBrand" TEXT;

CREATE UNIQUE INDEX "User_publicAuthorSlug_key" ON "User"("publicAuthorSlug");

ALTER TABLE "ShareToken"
ADD COLUMN "accessMode" TEXT DEFAULT 'PREVIEW';

ALTER TABLE "TrainingPlan"
ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN "accessState" TEXT NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN "primarySport" TEXT,
ADD COLUMN "sportSubtype" TEXT,
ADD COLUMN "skillLevel" TEXT,
ADD COLUMN "planLanguage" TEXT,
ADD COLUMN "daysPerWeek" INTEGER,
ADD COLUMN "weeklyVolumeBand" TEXT,
ADD COLUMN "goalLabel" TEXT,
ADD COLUMN "equipmentTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "publicHeadline" TEXT,
ADD COLUMN "publicDescription" TEXT,
ADD COLUMN "methodology" TEXT,
ADD COLUMN "whoItsFor" TEXT,
ADD COLUMN "faq" TEXT,
ADD COLUMN "extraContent" TEXT,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "TrainingPlan_visibility_accessState_idx" ON "TrainingPlan"("visibility", "accessState");
CREATE INDEX "TrainingPlan_primarySport_sportSubtype_idx" ON "TrainingPlan"("primarySport", "sportSubtype");
CREATE INDEX "TrainingPlan_skillLevel_daysPerWeek_idx" ON "TrainingPlan"("skillLevel", "daysPerWeek");

CREATE TABLE "TrainingPlanPublicSampleWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlanPublicSampleWeek_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingPlanPublicSampleWeek_planId_weekId_key" ON "TrainingPlanPublicSampleWeek"("planId", "weekId");
CREATE INDEX "TrainingPlanPublicSampleWeek_planId_idx" ON "TrainingPlanPublicSampleWeek"("planId");
CREATE INDEX "TrainingPlanPublicSampleWeek_weekId_idx" ON "TrainingPlanPublicSampleWeek"("weekId");

ALTER TABLE "TrainingPlanPublicSampleWeek"
ADD CONSTRAINT "TrainingPlanPublicSampleWeek_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingPlanPublicSampleWeek"
ADD CONSTRAINT "TrainingPlanPublicSampleWeek_weekId_fkey"
FOREIGN KEY ("weekId") REFERENCES "TrainingWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
