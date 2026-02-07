-- CreateTable
CREATE TABLE "LlmOperationOverride" (
    "id" TEXT NOT NULL,
    "tierSettingsId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT,
    "thinkingBudget" INTEGER,
    "thinkingLevel" TEXT,
    "maxSteps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmOperationOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlmOperationOverride_tierSettingsId_operation_key" ON "LlmOperationOverride"("tierSettingsId", "operation");

-- AddForeignKey
ALTER TABLE "LlmOperationOverride" ADD CONSTRAINT "LlmOperationOverride_tierSettingsId_fkey" FOREIGN KEY ("tierSettingsId") REFERENCES "LlmTierSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
