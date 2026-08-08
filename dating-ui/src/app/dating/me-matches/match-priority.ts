/**
 * Priority helpers — re-export VM grouping (Sprint 47 Story 1).
 * Prefer importing from `@/lib/matches/map-me-match-to-view-model` for new code.
 */

import {
  groupMatchesByPriorityVm,
  resolveMatchTier,
} from '@/lib/matches/map-me-match-to-view-model';
import type {
  GroupedPriorityMatchesVM,
  MatchListItemVM,
  MatchPriorityTier,
} from '@/lib/matches/match-view-models';

export type { MatchPriorityTier, GroupedPriorityMatchesVM as GroupedPriorityMatches };

/** @deprecated Prefer resolveMatchTier from map-me-match-to-view-model */
export function resolvePriorityTier(m: MatchListItemVM): MatchPriorityTier {
  return m.tier ?? resolveMatchTier({ score: m.score });
}

export function groupMatchesByPriority(
  matches: MatchListItemVM[],
): GroupedPriorityMatchesVM {
  return groupMatchesByPriorityVm(matches);
}
