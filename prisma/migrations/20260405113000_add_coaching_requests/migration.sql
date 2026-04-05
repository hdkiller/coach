CREATE TABLE "CoachingRequest" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'coachStartPage',
    "answers" JSONB,
    "athleteSnapshot" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachingRequest_coachId_status_idx" ON "CoachingRequest"("coachId", "status");
CREATE INDEX "CoachingRequest_athleteId_status_idx" ON "CoachingRequest"("athleteId", "status");
CREATE UNIQUE INDEX "CoachingRequest_pending_unique_idx" ON "CoachingRequest"("coachId", "athleteId") WHERE "status" = 'PENDING';

ALTER TABLE "CoachingRequest"
ADD CONSTRAINT "CoachingRequest_coachId_fkey"
FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachingRequest"
ADD CONSTRAINT "CoachingRequest_athleteId_fkey"
FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
