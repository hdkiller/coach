-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "description" TEXT,
ADD COLUMN     "fromTemplateId" TEXT,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "goalId" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "targetDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TrainingPlan_isTemplate_idx" ON "TrainingPlan"("isTemplate");

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_fromTemplateId_fkey" FOREIGN KEY ("fromTemplateId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
