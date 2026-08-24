import type { MatchListRankPresentationJson } from '../match-list-rank-presentation.types';

/** Sprint 31 — rank rows for MatchListRank persistence (Story 2 + Sprint 68 presentation cache). */
export type MatchListRankSnapshotRow = {
  candidateProfileId: string;
  matchScore: number;
  hardBlocked: boolean;
  presentationJson: MatchListRankPresentationJson | null;
};

/** Sprint 31 — rows for MatchListRank persistence (Story 2). */
export type MatchListRankSnapshot = {
  status: 'ready' | 'not_ready' | 'budget_exceeded';
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  rows: MatchListRankSnapshotRow[];
};
