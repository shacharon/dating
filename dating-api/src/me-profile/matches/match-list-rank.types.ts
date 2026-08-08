/** Sprint 31 — thin rows for MatchListRank persistence (Story 2). */
export type MatchListRankSnapshot = {
  status: 'ready' | 'not_ready' | 'budget_exceeded';
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  rows: Array<{
    candidateProfileId: string;
    matchScore: number;
    hardBlocked: boolean;
  }>;
};
