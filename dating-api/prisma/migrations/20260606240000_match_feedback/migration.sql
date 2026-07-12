-- CreateEnum
CREATE TYPE "MatchFeedbackSentiment" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateTable
CREATE TABLE "MatchFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchProfileId" TEXT NOT NULL,
    "sentiment" "MatchFeedbackSentiment" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchFeedback_userId_matchProfileId_key" ON "MatchFeedback"("userId", "matchProfileId");

-- CreateIndex
CREATE INDEX "MatchFeedback_userId_createdAt_idx" ON "MatchFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchFeedback_matchProfileId_idx" ON "MatchFeedback"("matchProfileId");

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_matchProfileId_fkey" FOREIGN KEY ("matchProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
