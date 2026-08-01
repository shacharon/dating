-- Sprint 32 Story 1 — message violation conversation + recipient context

ALTER TABLE "UserContentViolation" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE "UserContentViolation" ADD COLUMN IF NOT EXISTS "recipientUserId" TEXT;

CREATE INDEX IF NOT EXISTS "UserContentViolation_recipientUserId_createdAt_idx"
  ON "UserContentViolation"("recipientUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "UserContentViolation_conversationId_createdAt_idx"
  ON "UserContentViolation"("conversationId", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserContentViolation_conversationId_fkey'
  ) THEN
    ALTER TABLE "UserContentViolation"
      ADD CONSTRAINT "UserContentViolation_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "MutualMatch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserContentViolation_recipientUserId_fkey'
  ) THEN
    ALTER TABLE "UserContentViolation"
      ADD CONSTRAINT "UserContentViolation_recipientUserId_fkey"
      FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
