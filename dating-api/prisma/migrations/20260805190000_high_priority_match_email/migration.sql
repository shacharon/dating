-- Sprint 43 Story 2 - HIGH browse-match email prefs + send log
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "highPriorityMatchEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "HighPriorityMatchEmailLog" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HighPriorityMatchEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HighPriorityMatchEmailLog_viewerUserId_candidateProfileId_key" ON "HighPriorityMatchEmailLog"("viewerUserId", "candidateProfileId");
CREATE INDEX IF NOT EXISTS "HighPriorityMatchEmailLog_viewerUserId_sentAt_idx" ON "HighPriorityMatchEmailLog"("viewerUserId", "sentAt");

DO $$ BEGIN
  ALTER TABLE "HighPriorityMatchEmailLog" ADD CONSTRAINT "HighPriorityMatchEmailLog_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;