import {
  DATING_POLICY_CATEGORY,
  DATING_POLICY_NEAR_MISS_FLOOR,
  datingPolicySexualScoreMin,
  isDatingPolicyEnabled,
  type ContentPolicyDecision,
  type ModerationResult,
} from './content-moderation.types';

/** EN MVP sexual-solicit spam patterns (Sprint 32 Story 03). */
const DATING_BLOCKLIST: RegExp[] = [
  /\bi\s+want\s+to\s+fuck\b/i,
  /\bwanna\s+fuck\b/i,
  /\bwant\s+to\s+fuck\b/i,
  /\bsend\s+nudes?\b/i,
];

export type DatingBlocklistHit = {
  matchedText: string;
  index: number;
  length: number;
  patternSource: string;
};

export function findDatingBlocklistHit(
  text: string,
): DatingBlocklistHit | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const re of DATING_BLOCKLIST) {
    const match = re.exec(trimmed);
    if (match && match[0] != null && match.index != null) {
      return {
        matchedText: match[0],
        index: match.index,
        length: match[0].length,
        patternSource: re.source,
      };
    }
  }
  return null;
}

export function matchesDatingBlocklist(text: string): boolean {
  return findDatingBlocklistHit(text) != null;
}

export function evaluateContentPolicy(
  text: string,
  moderation: ModerationResult,
  env: NodeJS.ProcessEnv = process.env,
): ContentPolicyDecision {
  if (!moderation.failOpen && moderation.flagged) {
    return {
      allow: false,
      source: 'openai',
      category:
        moderation.primaryCategory ?? moderation.categories[0] ?? 'unknown',
      score: moderation.score,
      action: 'blocked',
    };
  }

  if (!isDatingPolicyEnabled(env)) {
    return { allow: true };
  }

  if (matchesDatingBlocklist(text)) {
    const score = moderation.failOpen
      ? null
      : (moderation.sexualScore ?? moderation.score);
    return {
      allow: false,
      source: 'dating_blocklist',
      category: DATING_POLICY_CATEGORY,
      score,
      action: 'blocked',
    };
  }

  const sexualMin = datingPolicySexualScoreMin(env);
  const sexual = moderation.sexualScore;
  if (
    !moderation.failOpen &&
    sexual != null &&
    sexual >= sexualMin
  ) {
    return {
      allow: false,
      source: 'dating_score',
      category: DATING_POLICY_CATEGORY,
      score: sexual,
      action: 'blocked',
    };
  }

  return { allow: true };
}

/** Call only after `evaluateContentPolicy` returned allow. */
export function isDatingPolicyNearMiss(
  text: string,
  moderation: ModerationResult,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isDatingPolicyEnabled(env)) return false;
  if (moderation.failOpen || moderation.flagged) return false;
  if (matchesDatingBlocklist(text)) return false;
  const sexual = moderation.sexualScore;
  if (sexual == null) return false;
  const min = datingPolicySexualScoreMin(env);
  return sexual >= DATING_POLICY_NEAR_MISS_FLOOR && sexual < min;
}
