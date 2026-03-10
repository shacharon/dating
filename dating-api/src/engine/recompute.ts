/**
 * Recompute all pairwise matches after engine policy changes.
 * No duplicate pairs: for each i < j, exactly one match (users[i], users[j]).
 */

import type {
  CompareNotAnalyzedResultDto,
  CompareResultDto,
} from '../matches/match-engine';
import { compareWithStatus as computeMatchWithStatus } from '../matches/match-engine';
import type { ProfileJsonPayload } from '../profiles/profiles-json.service';

export const RECOMPUTE_POLICY_VERSION = 'v2';

export interface RecomputeMatchResult extends CompareResultDto {
  userA: string;
  userB: string;
  policyVersion: string;
}

/**
 * Recompute matches for all pairs (i, j) with i < j.
 * Does not duplicate matches; keeps userA and userB ids; sets policyVersion = "v2".
 */
export async function recomputeAllMatches(
  users: ProfileJsonPayload[],
): Promise<RecomputeMatchResult[]> {
  const results: RecomputeMatchResult[] = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const match: CompareResultDto | CompareNotAnalyzedResultDto =
        computeMatchWithStatus(users[i], users[j]);
      if ('status' in match && match.status === 'NOT_ANALYZED') {
        continue;
      }
      const computed = match as CompareResultDto;
      results.push({
        ...computed,
        userA: users[i].id,
        userB: users[j].id,
        policyVersion: RECOMPUTE_POLICY_VERSION,
      });
    }
  }

  return results;
}
