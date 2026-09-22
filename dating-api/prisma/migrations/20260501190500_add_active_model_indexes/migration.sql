-- Add indexes for active candidate/read session paths.
CREATE INDEX IF NOT EXISTS "UserProfile_status_gender_birthDate_idx"
  ON "UserProfile"("status", "gender", "birthDate");

CREATE INDEX IF NOT EXISTS "UserProfile_status_gender_city_idx"
  ON "UserProfile"("status", "gender", "city");

CREATE INDEX IF NOT EXISTS "UserSession_userId_expiresAt_idx"
  ON "UserSession"("userId", "expiresAt");

CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx"
  ON "UserSession"("expiresAt");
