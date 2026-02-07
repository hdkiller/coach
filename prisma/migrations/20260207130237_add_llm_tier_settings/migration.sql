-- CreateTable
CREATE TABLE "LlmTierSettings" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'flash',
    "thinkingBudget" INTEGER NOT NULL DEFAULT 2000,
    "thinkingLevel" TEXT NOT NULL DEFAULT 'low',
    "maxSteps" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmTierSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlmTierSettings_tier_key" ON "LlmTierSettings"("tier");
