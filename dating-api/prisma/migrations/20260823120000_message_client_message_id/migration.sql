-- Sprint 68 Story 2: optional clientMessageId for send idempotency
ALTER TABLE "Message" ADD COLUMN "clientMessageId" TEXT;

CREATE UNIQUE INDEX "Message_idempotency_key" ON "Message"("conversationId", "senderId", "clientMessageId");
