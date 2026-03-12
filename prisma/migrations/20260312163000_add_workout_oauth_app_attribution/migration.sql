ALTER TABLE "Workout"
ADD COLUMN "oauthAppId" TEXT;

CREATE INDEX "Workout_oauthAppId_idx" ON "Workout"("oauthAppId");

ALTER TABLE "Workout"
ADD CONSTRAINT "Workout_oauthAppId_fkey"
FOREIGN KEY ("oauthAppId") REFERENCES "OAuthApp"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
