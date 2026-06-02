-- CreateEnum
CREATE TYPE "MutualMatchStatus" AS ENUM ('ACTIVE', 'UNMATCHED');

-- CreateTable
CREATE TABLE "MutualMatch" (
    "id" TEXT NOT NULL,
    "userId1" TEXT NOT NULL,
    "userId2" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MutualMatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "unmatchedAt" TIMESTAMP(3),
    "unmatchedByUserId" TEXT,

    CONSTRAINT "MutualMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MutualMatch_userId1_status_idx" ON "MutualMatch"("userId1", "status");

-- CreateIndex
CREATE INDEX "MutualMatch_userId2_status_idx" ON "MutualMatch"("userId2", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MutualMatch_userId1_userId2_key" ON "MutualMatch"("userId1", "userId2");

-- AddForeignKey
ALTER TABLE "MutualMatch" ADD CONSTRAINT "MutualMatch_userId1_fkey" FOREIGN KEY ("userId1") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutualMatch" ADD CONSTRAINT "MutualMatch_userId2_fkey" FOREIGN KEY ("userId2") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
