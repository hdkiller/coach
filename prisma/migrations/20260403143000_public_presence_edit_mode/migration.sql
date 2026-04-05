ALTER TABLE "User"
ADD COLUMN "coachProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "coachProfileSlug" TEXT,
ADD COLUMN "coachPublicPage" JSONB,
ADD COLUMN "athleteProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "athleteProfileSlug" TEXT,
ADD COLUMN "athletePublicPage" JSONB;

CREATE UNIQUE INDEX "User_coachProfileSlug_key" ON "User"("coachProfileSlug");
CREATE UNIQUE INDEX "User_athleteProfileSlug_key" ON "User"("athleteProfileSlug");

UPDATE "User"
SET "coachProfileEnabled" = CASE WHEN "publicAuthorSlug" IS NOT NULL THEN true ELSE false END,
    "coachProfileSlug" = COALESCE("publicAuthorSlug", "coachProfileSlug")
WHERE "publicAuthorSlug" IS NOT NULL;
