-- CreateTable
CREATE TABLE "BugReportComment" (
    "id" TEXT NOT NULL,
    "bugReportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReportComment_bugReportId_idx" ON "BugReportComment"("bugReportId");

-- CreateIndex
CREATE INDEX "BugReportComment_userId_idx" ON "BugReportComment"("userId");

-- AddForeignKey
ALTER TABLE "BugReportComment" ADD CONSTRAINT "BugReportComment_bugReportId_fkey" FOREIGN KEY ("bugReportId") REFERENCES "BugReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugReportComment" ADD CONSTRAINT "BugReportComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
