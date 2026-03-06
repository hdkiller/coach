-- Add durable chat turn execution primitives
ALTER TABLE "ChatMessage"
ADD COLUMN "turnId" TEXT;

ALTER TABLE "LlmUsage"
ADD COLUMN "turnId" TEXT;

CREATE TABLE "ChatTurn" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userMessageId" TEXT NOT NULL,
    "assistantMessageId" TEXT,
    "status" TEXT NOT NULL,
    "lineageId" TEXT NOT NULL,
    "retryOfTurnId" TEXT,
    "runId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "providerRequestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTurn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatTurnEvent" (
    "id" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTurnEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatTurnToolExecution" (
    "id" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "lineageId" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "argsHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTurnToolExecution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_turnId_idx" ON "ChatMessage"("turnId");
CREATE INDEX "LlmUsage_turnId_idx" ON "LlmUsage"("turnId");
CREATE INDEX "ChatTurn_roomId_createdAt_idx" ON "ChatTurn"("roomId", "createdAt");
CREATE INDEX "ChatTurn_userId_createdAt_idx" ON "ChatTurn"("userId", "createdAt");
CREATE INDEX "ChatTurn_status_lastHeartbeatAt_idx" ON "ChatTurn"("status", "lastHeartbeatAt");
CREATE INDEX "ChatTurn_lineageId_createdAt_idx" ON "ChatTurn"("lineageId", "createdAt");
CREATE INDEX "ChatTurnEvent_turnId_createdAt_idx" ON "ChatTurnEvent"("turnId", "createdAt");
CREATE INDEX "ChatTurnEvent_type_createdAt_idx" ON "ChatTurnEvent"("type", "createdAt");
CREATE UNIQUE INDEX "ChatTurnToolExecution_turnId_toolCallId_key" ON "ChatTurnToolExecution"("turnId", "toolCallId");
CREATE INDEX "ChatTurnToolExecution_lineageId_toolName_argsHash_status_idx" ON "ChatTurnToolExecution"("lineageId", "toolName", "argsHash", "status");
CREATE INDEX "ChatTurnToolExecution_turnId_status_idx" ON "ChatTurnToolExecution"("turnId", "status");
CREATE INDEX "ChatTurnToolExecution_idempotencyKey_idx" ON "ChatTurnToolExecution"("idempotencyKey");

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_turnId_fkey"
FOREIGN KEY ("turnId") REFERENCES "ChatTurn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LlmUsage"
ADD CONSTRAINT "LlmUsage_turnId_fkey"
FOREIGN KEY ("turnId") REFERENCES "ChatTurn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatTurn"
ADD CONSTRAINT "ChatTurn_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatTurn"
ADD CONSTRAINT "ChatTurn_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatTurnEvent"
ADD CONSTRAINT "ChatTurnEvent_turnId_fkey"
FOREIGN KEY ("turnId") REFERENCES "ChatTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatTurnToolExecution"
ADD CONSTRAINT "ChatTurnToolExecution_turnId_fkey"
FOREIGN KEY ("turnId") REFERENCES "ChatTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
