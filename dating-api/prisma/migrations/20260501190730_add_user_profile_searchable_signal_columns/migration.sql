-- Add DB-first searchable UserProfile columns (additive only).
ALTER TABLE "UserProfile"
  ADD COLUMN "interestsTop" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sigEmotionalDepth" INTEGER,
  ADD COLUMN "sigLifestylePace" INTEGER,
  ADD COLUMN "sigConflictStyle" INTEGER,
  ADD COLUMN "sigIndependence" INTEGER,
  ADD COLUMN "sigSocialBattery" INTEGER;
