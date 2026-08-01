-- Sprint 28 Story 3 — hot-path indexes (unread, photo gate, match feedback).
-- Default path: this migration (CREATE INDEX inside Prisma's transaction) — fine for small/dev DBs.
--
-- Large production: CREATE INDEX CONCURRENTLY cannot run inside a migration transaction.
-- Apply manually, then mark applied:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_conversationId_senderId_status_createdAt_idx"
--     ON "Message"("conversationId", "senderId", "status", "createdAt");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserProfilePhoto_profileId_status_idx"
--     ON "UserProfilePhoto"("profileId", "status");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "MatchFeedback_sentiment_createdAt_idx"
--     ON "MatchFeedback"("sentiment", "createdAt");
--   npx prisma migrate resolve --applied 20260801120000_add_scale_hot_path_indexes
-- See docs/ops/INDEX_MIGRATIONS.md.

-- CreateIndex
CREATE INDEX "Message_conversationId_senderId_status_createdAt_idx" ON "Message"("conversationId", "senderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UserProfilePhoto_profileId_status_idx" ON "UserProfilePhoto"("profileId", "status");

-- CreateIndex
CREATE INDEX "MatchFeedback_sentiment_createdAt_idx" ON "MatchFeedback"("sentiment", "createdAt");
