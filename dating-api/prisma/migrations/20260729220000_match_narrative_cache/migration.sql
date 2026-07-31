-- CreateTable
CREATE TABLE "MatchNarrativeCache" (
    "id" TEXT NOT NULL,
    "viewerProfileId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "viewerEvaluationId" TEXT NOT NULL,
    "candidateEvaluationId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchNarrativeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchNarrativeCache_viewerProfileId_candidateProfileId_idx" ON "MatchNarrativeCache"("viewerProfileId", "candidateProfileId");

-- CreateIndex
CREATE INDEX "MatchNarrativeCache_createdAt_idx" ON "MatchNarrativeCache"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchNarrativeCache_viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion_key" ON "MatchNarrativeCache"("viewerProfileId", "candidateProfileId", "viewerEvaluationId", "candidateEvaluationId", "promptVersion");
