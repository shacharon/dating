/*
  Warnings:

  - You are about to drop the `ProfileExtractionV2` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProfileExtractionV2" DROP CONSTRAINT "ProfileExtractionV2_profileId_fkey";

-- DropTable
DROP TABLE "ProfileExtractionV2";
