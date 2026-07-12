-- Add indexes for active candidate/read session paths.
CREATE INDEX "UserProfile_status_gender_birthDate_idx"
  ON "UserProfile"("status", "gender", "birthDate");

CREATE INDEX "UserProfile_status_gender_city_idx"
  ON "UserProfile"("status", "gender", "city");

CREATE INDEX "UserSession_userId_expiresAt_idx"
  ON "UserSession"("userId", "expiresAt");

CREATE INDEX "UserSession_expiresAt_idx"
  ON "UserSession"("expiresAt");
