-- CreateEnum
CREATE TYPE "UserReportReason" AS ENUM ('HARASSMENT', 'SPAM', 'FAKE_PROFILE', 'INAPPROPRIATE_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "UserReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTION_TAKEN');

-- CreateEnum
CREATE TYPE "UserReportContextType" AS ENUM ('MATCH_PROFILE', 'CONVERSATION');

-- CreateTable
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reason" "UserReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "contextType" "UserReportContextType" NOT NULL,
    "contextId" TEXT NOT NULL,
    "status" "UserReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserReport_status_createdAt_idx" ON "UserReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_reportedUserId_status_idx" ON "UserReport"("reportedUserId", "status");

-- CreateIndex
CREATE INDEX "UserReport_reporterUserId_reportedUserId_reason_createdAt_idx" ON "UserReport"("reporterUserId", "reportedUserId", "reason", "createdAt");

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
