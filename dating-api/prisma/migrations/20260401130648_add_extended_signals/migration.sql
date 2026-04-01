-- AlterTable
ALTER TABLE "ProfileExtractionV2" ADD COLUMN     "boundaries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lifestyleTraits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "values" TEXT[] DEFAULT ARRAY[]::TEXT[];
