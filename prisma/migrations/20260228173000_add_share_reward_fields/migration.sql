ALTER TABLE "User"
ADD COLUMN "shareRewardClaimedAt" TIMESTAMP(3),
ADD COLUMN "shareRewardDaysGranted" INTEGER DEFAULT 0;
