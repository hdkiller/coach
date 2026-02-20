-- AlterTable
ALTER TABLE "User" ADD COLUMN "pendingSubscriptionPeriodEnd" TIMESTAMP(3),
ADD COLUMN "pendingSubscriptionTier" "SubscriptionTier";
