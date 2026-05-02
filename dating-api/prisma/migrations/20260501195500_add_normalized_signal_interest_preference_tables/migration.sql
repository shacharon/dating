-- Add normalized DB-first tables for signals, interests, and preferences.
CREATE TABLE "UserProfileSignal" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "signalKey" TEXT NOT NULL,
  "signalValue" INTEGER NOT NULL,
  "evalVersion" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProfileSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProfileInterest" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL,
  "evalVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProfileInterest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProfilePreference" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "partnerAgeMin" INTEGER,
  "partnerAgeMax" INTEGER,
  "maxDistanceKm" INTEGER,
  "minimumPartnerEducation" TEXT,
  "acceptedPartnerGenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "acceptedPartnerSmoking" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "acceptedPartnerAlcohol" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "acceptedPartnerReligions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "partnerWantsChildren" TEXT,
  "partnerHasChildren" TEXT,
  "similarityPreference" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProfilePreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfileSignal_profileId_signalKey_key" ON "UserProfileSignal"("profileId", "signalKey");
CREATE INDEX "UserProfileSignal_profileId_idx" ON "UserProfileSignal"("profileId");
CREATE INDEX "UserProfileSignal_signalKey_signalValue_idx" ON "UserProfileSignal"("signalKey", "signalValue");

CREATE UNIQUE INDEX "UserProfileInterest_profileId_tag_key" ON "UserProfileInterest"("profileId", "tag");
CREATE INDEX "UserProfileInterest_profileId_rank_idx" ON "UserProfileInterest"("profileId", "rank");
CREATE INDEX "UserProfileInterest_tag_idx" ON "UserProfileInterest"("tag");

CREATE UNIQUE INDEX "UserProfilePreference_profileId_key" ON "UserProfilePreference"("profileId");

ALTER TABLE "UserProfileSignal" ADD CONSTRAINT "UserProfileSignal_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProfileInterest" ADD CONSTRAINT "UserProfileInterest_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProfilePreference" ADD CONSTRAINT "UserProfilePreference_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
