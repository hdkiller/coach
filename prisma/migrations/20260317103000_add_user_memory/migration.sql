ALTER TABLE "User"
ADD COLUMN "aiMemoryEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "UserMemoryScope" AS ENUM ('GLOBAL', 'ROOM');
CREATE TYPE "UserMemoryCategory" AS ENUM (
  'PREFERENCE',
  'GOAL',
  'CONSTRAINT',
  'PROFILE',
  'COMMUNICATION',
  'TEMPORARY'
);
CREATE TYPE "UserMemorySource" AS ENUM ('AUTO', 'USER_EXPLICIT', 'MANUAL_UI');
CREATE TYPE "UserMemoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

CREATE TABLE "UserMemory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scope" "UserMemoryScope" NOT NULL,
  "roomId" TEXT,
  "category" "UserMemoryCategory" NOT NULL,
  "content" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source" "UserMemorySource" NOT NULL,
  "status" "UserMemoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "lastConfirmedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserMemory_userId_status_idx" ON "UserMemory"("userId", "status");
CREATE INDEX "UserMemory_userId_scope_status_idx" ON "UserMemory"("userId", "scope", "status");
CREATE INDEX "UserMemory_roomId_status_idx" ON "UserMemory"("roomId", "status");
CREATE INDEX "UserMemory_userId_normalizedKey_status_idx" ON "UserMemory"("userId", "normalizedKey", "status");

ALTER TABLE "UserMemory"
ADD CONSTRAINT "UserMemory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserMemory"
ADD CONSTRAINT "UserMemory_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
