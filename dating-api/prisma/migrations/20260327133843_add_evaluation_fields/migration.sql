-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "evaluatedAt" TIMESTAMP(3),
ADD COLUMN     "evaluation" JSONB,
ADD COLUMN     "policyVersion" TEXT,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "signals" JSONB,
ADD COLUMN     "textHash" TEXT;
