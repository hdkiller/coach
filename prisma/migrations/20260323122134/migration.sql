-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "TrainingPlanFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlanFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteTrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteTrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingPlanFolder_userId_idx" ON "TrainingPlanFolder"("userId");

-- CreateIndex
CREATE INDEX "TrainingPlanFolder_parentId_idx" ON "TrainingPlanFolder"("parentId");

-- CreateIndex
CREATE INDEX "FavoriteTrainingPlan_userId_idx" ON "FavoriteTrainingPlan"("userId");

-- CreateIndex
CREATE INDEX "FavoriteTrainingPlan_planId_idx" ON "FavoriteTrainingPlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteTrainingPlan_userId_planId_key" ON "FavoriteTrainingPlan"("userId", "planId");

-- CreateIndex
CREATE INDEX "TrainingPlan_folderId_idx" ON "TrainingPlan"("folderId");

-- CreateIndex
CREATE INDEX "TrainingPlan_teamId_idx" ON "TrainingPlan"("teamId");

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "TrainingPlanFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlanFolder" ADD CONSTRAINT "TrainingPlanFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlanFolder" ADD CONSTRAINT "TrainingPlanFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TrainingPlanFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteTrainingPlan" ADD CONSTRAINT "FavoriteTrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteTrainingPlan" ADD CONSTRAINT "FavoriteTrainingPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
