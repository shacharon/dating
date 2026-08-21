import type { IMatchActionsRepository } from './match-actions.repository';
import type { IMatchQueryRepository } from './match-query.repository';
import type { IMatchRankRepository } from './match-rank.repository';

export { MATCH_ACTIONS_REPOSITORY } from './match-actions.repository';
export type { IMatchActionsRepository } from './match-actions.repository';
export { MATCH_QUERY_REPOSITORY } from './match-query.repository';
export type { IMatchQueryRepository } from './match-query.repository';
export { MATCH_RANK_REPOSITORY } from './match-rank.repository';
export type { IMatchRankRepository } from './match-rank.repository';

/** Facade token — same PrismaMatchRepository instance as facet tokens. */
export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');

export type IMatchRepository = IMatchQueryRepository &
  IMatchActionsRepository &
  IMatchRankRepository;
