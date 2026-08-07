-- AlterEnum
CREATE TYPE "DatingChapter" AS ENUM ('first_chapter', 'ready_again', 'new_chapter');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "datingChapter" "DatingChapter";
