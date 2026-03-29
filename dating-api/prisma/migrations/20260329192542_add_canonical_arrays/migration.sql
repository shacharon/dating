-- AlterTable
ALTER TABLE "ProfileExtractionV2" ADD COLUMN     "hard_no" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "interests_partner" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "interests_self" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "negatives_partner" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "negatives_self" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "soft_no" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "ProfileExtractionV2_interests_self_idx" ON "ProfileExtractionV2" USING GIN ("interests_self");

-- CreateIndex
CREATE INDEX "ProfileExtractionV2_negatives_self_idx" ON "ProfileExtractionV2" USING GIN ("negatives_self");
