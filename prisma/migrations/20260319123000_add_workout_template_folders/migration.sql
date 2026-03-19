-- AlterTable
ALTER TABLE "WorkoutTemplate"
ADD COLUMN "folderId" TEXT;

-- CreateTable
CREATE TABLE "WorkoutTemplateFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplateFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutTemplate_folderId_idx" ON "WorkoutTemplate"("folderId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateFolder_userId_idx" ON "WorkoutTemplateFolder"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateFolder_parentId_idx" ON "WorkoutTemplateFolder"("parentId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateFolder_userId_parentId_order_idx" ON "WorkoutTemplateFolder"("userId", "parentId", "order");

-- AddForeignKey
ALTER TABLE "WorkoutTemplate"
ADD CONSTRAINT "WorkoutTemplate_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "WorkoutTemplateFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateFolder"
ADD CONSTRAINT "WorkoutTemplateFolder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateFolder"
ADD CONSTRAINT "WorkoutTemplateFolder_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "WorkoutTemplateFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
