-- CreateEnum
CREATE TYPE "UserProfileStatus" AS ENUM ('DRAFT', 'DISABLED');

-- CreateTable
CREATE TABLE "UserProductProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "UserProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "aboutMe" TEXT,
    "aboutPartner" TEXT,
    "aboutRelationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProductProfile_userId_key" ON "UserProductProfile"("userId");

-- AddForeignKey
ALTER TABLE "UserProductProfile" ADD CONSTRAINT "UserProductProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
