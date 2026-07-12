-- CreateEnum
CREATE TYPE "ProfileGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "UserProductProfile" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "desiredPartnerGenders" JSONB,
ADD COLUMN     "gender" "ProfileGender",
ADD COLUMN     "locationLabel" TEXT;
