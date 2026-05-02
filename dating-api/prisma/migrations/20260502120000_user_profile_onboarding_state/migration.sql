-- CreateEnum
CREATE TYPE "UserProfileOnboardingStep" AS ENUM ('BASIC', 'TEXTS', 'COMPLETED');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "nickname" TEXT,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Migrate onboardingStep from INTEGER to UserProfileOnboardingStep
ALTER TABLE "UserProfile" ADD COLUMN "onboardingStep_new" "UserProfileOnboardingStep";

UPDATE "UserProfile" SET "onboardingStep_new" = CASE
  WHEN "onboardingStep" = 1 THEN 'BASIC'::"UserProfileOnboardingStep"
  WHEN "onboardingStep" = 2 THEN 'TEXTS'::"UserProfileOnboardingStep"
  ELSE 'COMPLETED'::"UserProfileOnboardingStep"
END;

ALTER TABLE "UserProfile" DROP COLUMN "onboardingStep";
ALTER TABLE "UserProfile" RENAME COLUMN "onboardingStep_new" TO "onboardingStep";
ALTER TABLE "UserProfile" ALTER COLUMN "onboardingStep" SET NOT NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "onboardingStep" SET DEFAULT 'BASIC'::"UserProfileOnboardingStep";

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_nickname_key" ON "UserProfile"("nickname");
