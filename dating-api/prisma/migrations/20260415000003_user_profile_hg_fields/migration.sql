-- Phase 2: Extend UserProfile with Holy Grail structured fact and preference columns.
-- All columns are nullable (or default-empty arrays) so existing rows are unaffected.
-- The matching engine reads these to run HG Layer-3 hard eligibility on the new-model path.

-- AlterTable
ALTER TABLE "UserProfile"
  ADD COLUMN "childrenStatus"          TEXT,
  ADD COLUMN "wantsChildren"           TEXT,
  ADD COLUMN "smokingFrequency"        TEXT,
  ADD COLUMN "alcoholUse"              TEXT,
  ADD COLUMN "education"               TEXT,
  ADD COLUMN "religion"                TEXT,
  ADD COLUMN "partnerAgeMin"           INTEGER,
  ADD COLUMN "partnerAgeMax"           INTEGER,
  ADD COLUMN "minimumPartnerEducation" TEXT,
  ADD COLUMN "acceptedPartnerSmoking"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedPartnerAlcohol"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "partnerWantsChildren"    TEXT,
  ADD COLUMN "partnerHasChildren"      TEXT,
  ADD COLUMN "acceptedPartnerReligions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "maxDistanceKm"           INTEGER,
  ADD COLUMN "similarityPreference"    TEXT;
