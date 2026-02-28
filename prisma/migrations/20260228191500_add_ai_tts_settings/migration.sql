-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "aiTtsStyle" TEXT DEFAULT 'coach',
ADD COLUMN     "aiTtsVoiceName" TEXT DEFAULT 'Kore',
ADD COLUMN     "aiTtsSpeed" TEXT DEFAULT 'normal',
ADD COLUMN     "aiTtsAutoReadMessages" BOOLEAN NOT NULL DEFAULT false;
