-- Prisma schema marks aboutMe optional. The original table created it NOT NULL,
-- so a first save that omits the story fails with a null constraint.
ALTER TABLE "UserProfile" ALTER COLUMN "aboutMe" DROP NOT NULL;
