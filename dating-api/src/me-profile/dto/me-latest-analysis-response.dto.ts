import type { Prisma } from '@prisma/client';

/**
 * Latest persisted analysis for the authenticated product UserProfile row.
 * Backed by the UserProfileEvaluation table (product path), not MatchmakingProfile/ProfileEvaluation.
 */
export class MeLatestAnalysisResponseDto {
  /** Always the current user's `UserProfile.id`. */
  userProfileId!: string;
  /** `UserProfileEvaluation.id`, or null if no analysis row exists yet. */
  evaluationId!: string | null;
  /** ISO 8601 timestamp of the evaluation row, or null when absent. */
  createdAt!: string | null;
  /** Snapshot from `evaluateBatch` (`EvaluateBatchResult`), or null when absent. */
  evaluationJson!: Prisma.JsonValue | null;
}
