-- AlterEnum: add FLAGGED_FOR_REVIEW for ML mid-band + human review queue (Sprint 19 Story 2).
-- Existing rows keep PENDING / APPROVED / REJECTED; no status NULL backfill needed.

ALTER TYPE "UserProfilePhotoStatus" ADD VALUE 'FLAGGED_FOR_REVIEW';
