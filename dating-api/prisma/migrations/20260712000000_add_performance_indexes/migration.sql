-- Sprint 19 Story 1 — performance indexes for match candidate list / analysis.
-- No new tables. UserProfile is the browse-list source (no Match row).

CREATE INDEX IF NOT EXISTS "UserProfile_status_analyzedAt_idx"
  ON "UserProfile" ("status", "analyzedAt" DESC);

CREATE INDEX IF NOT EXISTS "UserProfile_status_userId_idx"
  ON "UserProfile" ("status", "userId");
