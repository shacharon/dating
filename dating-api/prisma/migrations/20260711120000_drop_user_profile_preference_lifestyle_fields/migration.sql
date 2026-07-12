-- Sprint 15 Story 1: drop lifestyle/education/family/similarity preference columns.
-- Self-fact columns on UserProfile are intentionally untouched.

ALTER TABLE "UserProfilePreference"
  DROP COLUMN IF EXISTS "minimumPartnerEducation",
  DROP COLUMN IF EXISTS "acceptedPartnerSmoking",
  DROP COLUMN IF EXISTS "acceptedPartnerAlcohol",
  DROP COLUMN IF EXISTS "acceptedPartnerReligions",
  DROP COLUMN IF EXISTS "partnerWantsChildren",
  DROP COLUMN IF EXISTS "partnerHasChildren",
  DROP COLUMN IF EXISTS "similarityPreference";
