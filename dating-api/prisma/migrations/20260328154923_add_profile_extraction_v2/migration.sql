-- CreateTable
CREATE TABLE "ProfileExtractionV2" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v2',
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptVersion" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "extractionJson" JSONB NOT NULL,
    "selfSignals" JSONB NOT NULL,
    "partnerSignals" JSONB NOT NULL,
    "relationshipSignals" JSONB NOT NULL,
    "coverageScore" INTEGER NOT NULL,
    "avgConfidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileExtractionV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileExtractionV2_profileId_key" ON "ProfileExtractionV2"("profileId");

-- CreateIndex
CREATE INDEX "ProfileExtractionV2_profileId_idx" ON "ProfileExtractionV2"("profileId");

-- CreateIndex
CREATE INDEX "ProfileExtractionV2_promptVersion_textHash_idx" ON "ProfileExtractionV2"("promptVersion", "textHash");

-- AddForeignKey
ALTER TABLE "ProfileExtractionV2" ADD CONSTRAINT "ProfileExtractionV2_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
