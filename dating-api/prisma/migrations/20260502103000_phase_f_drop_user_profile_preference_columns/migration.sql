-- Phase F: partner preference fields live only on UserProfilePreference (normalized).
-- UserProfile.desiredPartnerGenders JSON remains for product gender bridge until a later phase.

ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "partnerAgeMin";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "partnerAgeMax";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "minimumPartnerEducation";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "acceptedPartnerSmoking";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "acceptedPartnerAlcohol";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "partnerWantsChildren";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "partnerHasChildren";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "acceptedPartnerReligions";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "maxDistanceKm";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "similarityPreference";
