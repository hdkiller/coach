/*
  Warnings:

  - A unique constraint covering the columns `[planId,date,windowType]` on the table `NutritionPlanMeal` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "NutritionPlanMeal_planId_date_windowType_key" ON "NutritionPlanMeal"("planId", "date", "windowType");
