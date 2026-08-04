-- CreateTable
CREATE TABLE "ScheduledTaskConfig" (
    "id" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTaskConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledTaskConfig_taskName_key" ON "ScheduledTaskConfig"("taskName");
