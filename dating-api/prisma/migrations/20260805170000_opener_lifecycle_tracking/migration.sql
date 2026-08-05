-- AlterTable: Sprint 42 Story 3 — opener lifecycle analytics on ConversationStarterCache
ALTER TABLE "ConversationStarterCache" ADD COLUMN "displayed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationStarterCache" ADD COLUMN "displayedAt" TIMESTAMP(3);
ALTER TABLE "ConversationStarterCache" ADD COLUMN "usedAt" TIMESTAMP(3);
ALTER TABLE "ConversationStarterCache" ADD COLUMN "sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationStarterCache" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "ConversationStarterCache" ADD COLUMN "sentMessageId" TEXT;
ALTER TABLE "ConversationStarterCache" ADD COLUMN "mutualMatchId" TEXT;
ALTER TABLE "ConversationStarterCache" ADD COLUMN "receivedReply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationStarterCache" ADD COLUMN "replyReceivedAt" TIMESTAMP(3);
ALTER TABLE "ConversationStarterCache" ADD COLUMN "responseTimeMin" INTEGER;

-- CreateIndex
CREATE INDEX "ConversationStarterCache_sentMessageId_idx" ON "ConversationStarterCache"("sentMessageId");

-- CreateIndex
CREATE INDEX "ConversationStarterCache_mutualMatchId_idx" ON "ConversationStarterCache"("mutualMatchId");
