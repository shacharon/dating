-- Phase 3 Step 1: profile submission lifecycle
-- Extends UserProfileStatus enum and adds submission/analysis tracking columns.
--
-- Shadow / fresh-replay bootstrap (idempotent):
-- Later incremental SQL assumes `UserProfileStatus`, `User`, and `UserProfile` already exist.
-- Historically those objects lived outside this repo's migration chain; without this block,
-- `prisma migrate dev` fails on the shadow DB with: type "UserProfileStatus" does not exist (P3006).

-- ── Enums (safe on empty DB; no-op when type already exists) ─────────────────
DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserProfileStatus" AS ENUM ('DRAFT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProfileGender" AS ENUM (
    'MALE',
    'FEMALE',
    'NON_BINARY',
    'OTHER',
    'PREFER_NOT_TO_SAY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Core product tables (minimal shape before this migration alters UserProfile) ──
CREATE TABLE IF NOT EXISTS "User" (
  "id"          TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "googleId"    TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl"   TEXT,
  "status"      "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

CREATE TABLE IF NOT EXISTS "UserProfile" (
  "id"                    TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "name"                  TEXT NOT NULL DEFAULT '',
  "status"                "UserProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "onboardingStep"        INTEGER NOT NULL DEFAULT 1,
  "aboutMe"               TEXT,
  "aboutPartner"          TEXT,
  "aboutRelationship"     TEXT,
  "birthDate"             TIMESTAMP(3),
  "gender"                "ProfileGender",
  "desiredPartnerGenders" JSONB,
  "city"                  TEXT,
  "country"               TEXT,
  "locationLabel"         TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");

DO $$ BEGIN
  ALTER TABLE "UserProfile"
    ADD CONSTRAINT "UserProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserSession" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "sessionTokenHash" TEXT NOT NULL,
  "expiresAt"        TIMESTAMP(3) NOT NULL,
  "revokedAt"        TIMESTAMP(3),
  "lastSeenAt"       TIMESTAMP(3),
  "ip"               TEXT,
  "userAgent"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_sessionTokenHash_key" ON "UserSession"("sessionTokenHash");

DO $$ BEGIN
  ALTER TABLE "UserSession"
    ADD CONSTRAINT "UserSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
-- PostgreSQL does not support removing enum values; additions are safe and non-destructive.
ALTER TYPE "UserProfileStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "UserProfileStatus" ADD VALUE 'ANALYZING';
ALTER TYPE "UserProfileStatus" ADD VALUE 'ANALYZED';
ALTER TYPE "UserProfileStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "submittedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "analyzedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAnalysisError" TEXT;
