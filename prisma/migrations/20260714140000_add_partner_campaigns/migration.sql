-- CreateTable
CREATE TABLE "PartnerCampaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "grantedTier" "SubscriptionTier" NOT NULL,
    "accessDurationDays" INTEGER NOT NULL,
    "maxRedemptions" INTEGER NOT NULL,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartsAt" TIMESTAMP(3),
    "windowEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCampaignRedemption" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedTier" "SubscriptionTier" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCampaignRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCampaign_slug_key" ON "PartnerCampaign"("slug");

-- CreateIndex
CREATE INDEX "PartnerCampaign_isActive_idx" ON "PartnerCampaign"("isActive");

-- CreateIndex
CREATE INDEX "PartnerCampaignRedemption_userId_endsAt_idx" ON "PartnerCampaignRedemption"("userId", "endsAt");

-- CreateIndex
CREATE INDEX "PartnerCampaignRedemption_campaignId_idx" ON "PartnerCampaignRedemption"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCampaignRedemption_campaignId_userId_key" ON "PartnerCampaignRedemption"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "PartnerCampaignRedemption" ADD CONSTRAINT "PartnerCampaignRedemption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PartnerCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCampaignRedemption" ADD CONSTRAINT "PartnerCampaignRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
