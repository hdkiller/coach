-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Dashboard_ownerId_order_idx" ON "Dashboard"("ownerId", "order");
