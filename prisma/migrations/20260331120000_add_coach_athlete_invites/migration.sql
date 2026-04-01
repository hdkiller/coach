CREATE TABLE "CoachAthleteInvite" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAthleteInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachAthleteInvite_code_key" ON "CoachAthleteInvite"("code");
CREATE INDEX "CoachAthleteInvite_coachId_idx" ON "CoachAthleteInvite"("coachId");
CREATE INDEX "CoachAthleteInvite_email_idx" ON "CoachAthleteInvite"("email");
CREATE INDEX "CoachAthleteInvite_code_idx" ON "CoachAthleteInvite"("code");

ALTER TABLE "CoachAthleteInvite"
ADD CONSTRAINT "CoachAthleteInvite_coachId_fkey"
FOREIGN KEY ("coachId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
