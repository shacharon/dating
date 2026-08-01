-- Sprint 30 Story 1 — content moderation violation storage

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contentViolationStatus" TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contentViolationMutedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contentViolationCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "UserContentViolation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "flaggedText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserContentViolation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserContentViolation_userId_createdAt_idx"
  ON "UserContentViolation"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "UserContentViolation_surface_createdAt_idx"
  ON "UserContentViolation"("surface", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "UserContentViolation_userId_surface_createdAt_idx"
  ON "UserContentViolation"("userId", "surface", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserContentViolation_userId_fkey'
  ) THEN
    ALTER TABLE "UserContentViolation"
      ADD CONSTRAINT "UserContentViolation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
