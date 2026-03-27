-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aboutMe" TEXT NOT NULL,
    "aboutPartner" TEXT,
    "aboutRelationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
