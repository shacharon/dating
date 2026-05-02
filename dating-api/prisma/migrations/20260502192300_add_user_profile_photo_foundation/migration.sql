-- CreateEnum
CREATE TYPE "UserProfilePhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "UserProfilePhoto" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserProfilePhotoStatus" NOT NULL DEFAULT 'PENDING',
    "moderationProvider" TEXT,
    "moderationResultJson" JSONB,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfilePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProfilePhoto_profileId_idx" ON "UserProfilePhoto"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfilePhoto_profileId_position_key" ON "UserProfilePhoto"("profileId", "position");

-- AddForeignKey
ALTER TABLE "UserProfilePhoto" ADD CONSTRAINT "UserProfilePhoto_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
