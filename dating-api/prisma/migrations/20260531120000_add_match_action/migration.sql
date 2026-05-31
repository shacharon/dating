-- CreateEnum
CREATE TYPE "MatchActionType" AS ENUM ('LIKE', 'PASS', 'BLOCK');

-- CreateTable
CREATE TABLE "MatchAction" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetProfileIdSnapshot" TEXT NOT NULL,
    "action" "MatchActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchAction_actorUserId_action_idx" ON "MatchAction"("actorUserId", "action");

-- CreateIndex
CREATE INDEX "MatchAction_targetUserId_action_idx" ON "MatchAction"("targetUserId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAction_actorUserId_targetUserId_key" ON "MatchAction"("actorUserId", "targetUserId");

-- AddForeignKey
ALTER TABLE "MatchAction" ADD CONSTRAINT "MatchAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAction" ADD CONSTRAINT "MatchAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
