-- CreateTable
CREATE TABLE "NutritionRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "scope" TEXT NOT NULL,
    "windowType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "contextJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceRecommendationId" TEXT,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionPlanMeal" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "windowType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "targetJson" JSONB NOT NULL,
    "mealJson" JSONB NOT NULL,
    "actualNutritionItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealOptionCatalog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "windowType" TEXT NOT NULL,
    "absorptionType" TEXT NOT NULL,
    "dietaryBuckets" TEXT[],
    "baseMacros" JSONB NOT NULL,
    "keyIngredient" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "prepMinutes" INTEGER NOT NULL,
    "constraintTags" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealOptionCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionRecommendation_userId_date_idx" ON "NutritionRecommendation"("userId", "date");

-- CreateIndex
CREATE INDEX "NutritionRecommendation_status_idx" ON "NutritionRecommendation"("status");

-- CreateIndex
CREATE INDEX "NutritionPlan_userId_startDate_endDate_idx" ON "NutritionPlan"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "NutritionPlanMeal_planId_date_idx" ON "NutritionPlanMeal"("planId", "date");

-- CreateIndex
CREATE INDEX "MealOptionCatalog_windowType_idx" ON "MealOptionCatalog"("windowType");

-- CreateIndex
CREATE INDEX "MealOptionCatalog_absorptionType_idx" ON "MealOptionCatalog"("absorptionType");

-- AddForeignKey
ALTER TABLE "NutritionRecommendation" ADD CONSTRAINT "NutritionRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlanMeal" ADD CONSTRAINT "NutritionPlanMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
