-- HG post-eligibility ranking signals (self row): typed columns as runtime source of truth.
ALTER TABLE "ProfileSignalSnapshot" ADD COLUMN "hgRankingDailyRhythm" TEXT;
ALTER TABLE "ProfileSignalSnapshot" ADD COLUMN "hgRankingAutonomyTogetherness" TEXT;
ALTER TABLE "ProfileSignalSnapshot" ADD COLUMN "hgRankingInterestsTop" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
