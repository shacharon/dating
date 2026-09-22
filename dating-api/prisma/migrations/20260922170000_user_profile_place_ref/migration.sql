ALTER TABLE "UserProfile" ADD COLUMN "city_id" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "us_state_code" VARCHAR(2);

CREATE INDEX "UserProfile_city_id_idx" ON "UserProfile"("city_id");

ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_us_state_code_fkey" FOREIGN KEY ("us_state_code") REFERENCES "us_state"("code") ON DELETE SET NULL ON UPDATE CASCADE;
