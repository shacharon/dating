/**
 * Client-safe helpers — align with `dating-api/src/matches/children-unsure.*` and `match-ranking-contract.ts`
 * (`MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1`: `rankingScore` === legacy engine score for list sort;
 * HG triple is diagnostic-only; `children_unsure` is not a ranking penalty).
 */

export const HIDE_CHILDREN_UNSURE_QUERY_PARAM = 'hideChildrenUnsure';

export const CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_IMPRESSION = 'badge_impression';
export const CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK = 'badge_click';

export type ChildrenUnsureDirectionsLike = {
  readonly profile_a_to_profile_b: boolean;
  readonly profile_b_to_profile_a: boolean;
};

export function parseHideChildrenUnsure(raw: string | undefined): boolean {
  if (raw == null || raw === '') return false;
  const v = raw.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function anyChildrenUnsure(
  row: ChildrenUnsureDirectionsLike | null | undefined,
): boolean {
  if (!row) return false;
  return row.profile_a_to_profile_b || row.profile_b_to_profile_a;
}

export function getDisplayScore(match: {
  rankingScore?: number;
  finalScore?: number;
  overall: number;
}): number {
  return match.rankingScore ?? match.finalScore ?? match.overall;
}

export function childrenUnsureAnalyticsEventsUrl(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}/api/v1/matches/analytics/children-unsure/events`;
}
