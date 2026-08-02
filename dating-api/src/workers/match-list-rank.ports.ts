/**
 * DI ports for MatchListRank rebuild queue.
 * Do not confuse {@link MATCH_LIST_RANK_QUEUE_PORT} with the Bull queue name
 * string `MATCH_LIST_RANK_QUEUE` in `match-list-rank.queue.ts`.
 */

/** Nest DI token for enqueue / Bull status (Symbol — not the Bull queue name). */
export const MATCH_LIST_RANK_QUEUE_PORT = Symbol('MATCH_LIST_RANK_QUEUE_PORT');

export interface MatchListRankQueuePort {
  enqueueRebuild(viewerUserId: string, reason?: string): Promise<string>;
  isBullEnabled(): boolean;
}

/** Nest DI token for rebuild runner (provided as MeMatchesService). */
export const MATCH_LIST_RANK_REBUILD_PORT = Symbol(
  'MATCH_LIST_RANK_REBUILD_PORT',
);

export type MatchListRankRebuildResult = {
  status: 'ready' | 'not_ready' | 'budget_exceeded';
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  rowsWritten: number;
  rowsDeleted: number;
  rebuildMs: number;
};

export interface MatchListRankRebuildPort {
  rebuildMatchListRanks(
    viewerUserId: string,
    reason?: string,
  ): Promise<MatchListRankRebuildResult>;
}
