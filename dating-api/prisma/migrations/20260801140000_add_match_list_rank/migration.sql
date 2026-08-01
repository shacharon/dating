-- Sprint 31 Story 1 — MatchListRank (materialized match-list order; unused by list path until Story 04)

CREATE TABLE "MatchListRank" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "hardBlocked" BOOLEAN NOT NULL DEFAULT false,
    "builtAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchListRank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchListRank_viewerUserId_candidateProfileId_key" ON "MatchListRank"("viewerUserId", "candidateProfileId");

CREATE INDEX "MatchListRank_viewerUserId_hardBlocked_matchScore_candidateProfileId_idx" ON "MatchListRank"("viewerUserId", "hardBlocked", "matchScore" DESC, "candidateProfileId");

CREATE INDEX "MatchListRank_candidateProfileId_idx" ON "MatchListRank"("candidateProfileId");

CREATE INDEX "MatchListRank_viewerUserId_builtAt_idx" ON "MatchListRank"("viewerUserId", "builtAt");

ALTER TABLE "MatchListRank" ADD CONSTRAINT "MatchListRank_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchListRank" ADD CONSTRAINT "MatchListRank_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
