-- Sprint 8 Story 3: in-app notification opt-out on User
ALTER TABLE "User" ADD COLUMN "inAppNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
