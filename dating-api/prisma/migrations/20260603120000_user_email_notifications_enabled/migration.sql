-- Sprint 6: email notification opt-out on User
ALTER TABLE "User" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
