-- Remove legacy ProfileEvaluation / ProfileEvaluationRaw (product path uses UserProfileEvaluation).
--
-- Shadow-replay bootstrap: these tables are not created by earlier incremental migrations
-- (they predated this repo's migration chain). Fresh shadow DBs must materialize them
-- before we can drop FKs/tables idempotently.

-- ── Legacy Matchmaking cluster (names aligned with prisma/schema.prisma) ─────
CREATE TABLE IF NOT EXISTS "MatchmakingProfile" (
  "id"                             TEXT NOT NULL,
  "name"                           TEXT NOT NULL,
  "aboutMe"                        TEXT NOT NULL,
  "aboutPartner"                   TEXT,
  "aboutRelationship"              TEXT,
  "holyGrailStructuredFacts"       JSONB,
  "holyGrailStructuredPreferences" JSONB,
  "createdAt"                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchmakingProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProfileExtractionV2" (
  "id"                                TEXT NOT NULL,
  "profileId"                         TEXT NOT NULL,
  "promptVersion"                     TEXT NOT NULL,
  "textHash"                          TEXT NOT NULL,
  "extractionJson"                    JSONB NOT NULL,
  "selfSignals"                       JSONB NOT NULL,
  "partnerSignals"                    JSONB NOT NULL,
  "relationshipSignals"               JSONB NOT NULL,
  "coverageScore"                     INTEGER NOT NULL DEFAULT 0,
  "avgConfidence"                     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "interests_self"                    TEXT[] DEFAULT ARRAY[]::TEXT[],
  "interests_partner"                 TEXT[] DEFAULT ARRAY[]::TEXT[],
  "negatives_self"                    TEXT[] DEFAULT ARRAY[]::TEXT[],
  "negatives_partner"                 TEXT[] DEFAULT ARRAY[]::TEXT[],
  "soft_no"                           TEXT[] DEFAULT ARRAY[]::TEXT[],
  "hard_no"                           TEXT[] DEFAULT ARRAY[]::TEXT[],
  "interests"                         TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lifestyleTraits"                   TEXT[] DEFAULT ARRAY[]::TEXT[],
  "preferences"                       TEXT[] DEFAULT ARRAY[]::TEXT[],
  "boundaries"                        TEXT[] DEFAULT ARRAY[]::TEXT[],
  "values"                            TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relationship_clarity_self"         DOUBLE PRECISION,
  "relationship_clarity_partner"      DOUBLE PRECISION,
  "relationship_clarity_relationship" DOUBLE PRECISION,
  "extractedAt"                       TIMESTAMP(3),
  "createdAt"                         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileExtractionV2_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileExtractionV2_profileId_key" ON "ProfileExtractionV2"("profileId");

CREATE TABLE IF NOT EXISTS "ProfileSignalSnapshot" (
  "id"                            TEXT NOT NULL,
  "profileId"                     TEXT NOT NULL,
  "domain"                        TEXT NOT NULL,
  "ambition"                      DOUBLE PRECISION,
  "socialBattery"                 DOUBLE PRECISION,
  "healthBodyConsciousness"       DOUBLE PRECISION,
  "emotionalDepth"                DOUBLE PRECISION,
  "attachmentSecurity"            DOUBLE PRECISION,
  "directness"                    DOUBLE PRECISION,
  "independence"                  DOUBLE PRECISION,
  "traditionalism"                  DOUBLE PRECISION,
  "financialMindset"              DOUBLE PRECISION,
  "relationshipClarity"           DOUBLE PRECISION,
  "spirituality"                  DOUBLE PRECISION,
  "lifestylePace"                 DOUBLE PRECISION,
  "physicalPriority"              DOUBLE PRECISION,
  "statusOrientation"             DOUBLE PRECISION,
  "intellectualCuriosity"         DOUBLE PRECISION,
  "conflictStyle"                 DOUBLE PRECISION,
  "noveltyVsRoutine"              DOUBLE PRECISION,
  "structureChaosTolerance"       DOUBLE PRECISION,
  "hgRankingDailyRhythm"          TEXT,
  "hgRankingAutonomyTogetherness" TEXT,
  "hgRankingInterestsTop"         TEXT[] DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "ProfileSignalSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileSignalSnapshot_profileId_domain_key" ON "ProfileSignalSnapshot"("profileId", "domain");

CREATE TABLE IF NOT EXISTS "MatchPairHgSnapshot" (
  "id"                   TEXT NOT NULL,
  "matchId"              TEXT NOT NULL,
  "childrenUnsure"       BOOLEAN NOT NULL,
  "hgChildrenStatus"     TEXT NOT NULL,
  "hgOverallStatus"      TEXT NOT NULL,
  "hgSoftPassCount"      INTEGER NOT NULL,
  "hgRankPenaltyApplied" BOOLEAN NOT NULL,
  "hgPolicyVersion"      TEXT NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchPairHgSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatchPairHgSnapshot_matchId_key" ON "MatchPairHgSnapshot"("matchId");

CREATE TABLE IF NOT EXISTS "ProfileEvaluation" (
  "id"            TEXT NOT NULL,
  "profileId"     TEXT NOT NULL,
  "evaluatedAt"   TIMESTAMP(3),
  "promptVersion" TEXT,
  "policyVersion" TEXT,
  "textHash"      TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileEvaluation_profileId_key" ON "ProfileEvaluation"("profileId");

CREATE TABLE IF NOT EXISTS "ProfileEvaluationRaw" (
  "id"         TEXT NOT NULL,
  "profileId"  TEXT NOT NULL,
  "evaluation" JSONB NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileEvaluationRaw_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileEvaluationRaw_profileId_key" ON "ProfileEvaluationRaw"("profileId");

DO $$ BEGIN
  ALTER TABLE "ProfileExtractionV2"
    ADD CONSTRAINT "ProfileExtractionV2_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "MatchmakingProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProfileSignalSnapshot"
    ADD CONSTRAINT "ProfileSignalSnapshot_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "MatchmakingProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProfileEvaluation"
    ADD CONSTRAINT "ProfileEvaluation_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "MatchmakingProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProfileEvaluationRaw"
    ADD CONSTRAINT "ProfileEvaluationRaw_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "MatchmakingProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- DropForeignKey
ALTER TABLE "ProfileEvaluation" DROP CONSTRAINT IF EXISTS "ProfileEvaluation_profileId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileEvaluationRaw" DROP CONSTRAINT IF EXISTS "ProfileEvaluationRaw_profileId_fkey";

-- DropTable
DROP TABLE IF EXISTS "ProfileEvaluationRaw";

-- DropTable
DROP TABLE IF EXISTS "ProfileEvaluation";
