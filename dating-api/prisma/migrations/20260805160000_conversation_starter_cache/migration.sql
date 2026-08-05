-- CreateTable
CREATE TABLE "ConversationStarterCache" (
    "id" TEXT NOT NULL,
    "viewerProfileId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "viewerEvaluationId" TEXT NOT NULL,
    "candidateEvaluationId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "opener" VARCHAR(200) NOT NULL,
    "model" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationStarterCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationStarterCache_viewerProfileId_candidateProfileId_idx" ON "ConversationStarterCache"("viewerProfileId", "candidateProfileId");

-- CreateIndex
CREATE INDEX "ConversationStarterCache_createdAt_idx" ON "ConversationStarterCache"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationStarterCache_viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion_key" ON "ConversationStarterCache"("viewerProfileId", "candidateProfileId", "viewerEvaluationId", "candidateEvaluationId", "promptVersion");
