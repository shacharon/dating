/** Sprint 30 content-moderation shared types. */

export const CONTENT_VIOLATION_SURFACES = [
  'profile_aboutMe',
  'profile_aboutPartner',
  'profile_aboutRelationship',
  'message',
] as const;

export type ContentViolationSurface =
  (typeof CONTENT_VIOLATION_SURFACES)[number];

export type ContentViolationAction = 'warned' | 'blocked';

export type ContentViolationStatusValue =
  | 'ok'
  | 'profile_edit_blocked'
  | 'messaging_muted';

export type ModerationResult = {
  flagged: boolean;
  categories: string[];
  primaryCategory: string | null;
  score: number;
  failOpen: boolean;
};

/** Max characters sent to Moderation API (~3k token budget). */
export const MODERATION_INPUT_MAX_CHARS = 12_000;

export const MODERATION_TIMEOUT_MS = 5_000;

/**
 * Feature flag for Stories 02–03 gates.
 * Unset → enabled (true). Explicit 0/false/off/no → disabled.
 */
export function isContentModerationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.CONTENT_MODERATION_ENABLED?.trim().toLowerCase();
  if (raw === undefined || raw === '') return true;
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

export function pickPrimaryCategory(
  categoryScores: Record<string, number>,
  flaggedCategories: string[],
): { primaryCategory: string | null; score: number } {
  const prefer =
    flaggedCategories.length > 0
      ? flaggedCategories
      : Object.keys(categoryScores);
  let bestKey: string | null = null;
  let bestScore = -1;
  for (const key of prefer) {
    const s = categoryScores[key];
    if (typeof s !== 'number' || !Number.isFinite(s)) continue;
    if (s > bestScore) {
      bestScore = s;
      bestKey = key;
    }
  }
  if (bestKey == null) {
    for (const [key, s] of Object.entries(categoryScores)) {
      if (typeof s !== 'number' || !Number.isFinite(s)) continue;
      if (s > bestScore) {
        bestScore = s;
        bestKey = key;
      }
    }
  }
  return {
    primaryCategory: bestKey,
    score: bestKey == null ? 0 : bestScore,
  };
}
