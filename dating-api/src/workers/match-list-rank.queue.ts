export const MATCH_LIST_RANK_QUEUE = 'match-list-rank';

export type MatchListRankRebuildJobData = {
  viewerUserId: string;
  /** Free-form for logs (Story 03 will pass reasons). */
  reason?: string;
};

export function matchListRankRebuildJobId(viewerUserId: string): string {
  return `rebuild:${viewerUserId}`;
}
