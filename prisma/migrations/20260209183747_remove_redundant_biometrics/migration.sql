/*
  Warnings:

  - You are about to drop the column `ftp` on the `UserNutritionSettings` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `UserNutritionSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserNutritionSettings" DROP COLUMN "ftp",
DROP COLUMN "weight";
