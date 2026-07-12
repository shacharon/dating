-- Phase 3 Step 3: UserProfileEvaluation
-- Append-safe analysis output table linked to UserProfile.
-- One row per successful analysis run; multiple rows per profile allowed.
-- Latest-evaluation rule: WHERE "profileId" = $1 ORDER BY "createdAt" DESC LIMIT 1.

CREATE TABLE "UserProfileEvaluation" (
  "id"             TEXT         NOT NULL,
  "profileId"      TEXT         NOT NULL,
  "version"        TEXT         NOT NULL,
  "evaluationJson" JSONB        NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProfileEvaluation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserProfileEvaluation"
  ADD CONSTRAINT "UserProfileEvaluation_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Covering index for the latest-evaluation retrieval pattern.
CREATE INDEX "UserProfileEvaluation_profileId_createdAt_idx"
  ON "UserProfileEvaluation"("profileId", "createdAt" DESC);
