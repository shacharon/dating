import type { MatchListCursorPayload } from '../../cache/match-list-cache';
import type { RankPageRow, RankPersistRow } from './match.repository.types';

export const MATCH_RANK_REPOSITORY = Symbol('MATCH_RANK_REPOSITORY');

export interface IMatchRankRepository {
  deleteAllRanksForViewer(viewerUserId: string): Promise<number>;
  replaceRankSnapshot(
    viewerUserId: string,
    rows: RankPersistRow[],
    builtAt: Date,
  ): Promise<{ rowsWritten: number; rowsDeleted: number }>;
  fetchMatchListRankPage(
    viewerUserId: string,
    cursor: MatchListCursorPayload | null,
    take: number,
  ): Promise<RankPageRow[]>;
  countRanksForViewer(viewerUserId: string): Promise<number>;
}
