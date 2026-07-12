-- Phase 3.5: Make UserProfile.gender required (NOT NULL).
--
-- Safe transition strategy:
--   1. Backfill any existing NULL rows to PREFER_NOT_TO_SAY so no data is lost.
--      Users who skipped gender in the old optional flow are treated as "prefer not to say"
--      until they update their profile via the new required onboarding step.
--   2. Add NOT NULL constraint — safe because step 1 guarantees no NULLs remain.
--
UPDATE "UserProfile" SET "gender" = 'PREFER_NOT_TO_SAY' WHERE "gender" IS NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "gender" SET NOT NULL;
