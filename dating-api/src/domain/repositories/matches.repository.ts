/**
 * POC repository interface for matches.
 * Domain-only; no framework decorators. Implement in infrastructure layer.
 */

import type { UserId } from '../users/user.types';
import type { MatchId, MatchRecord } from '../matches/match.types';

export interface MatchesRepository {
  getById(id: MatchId): Promise<MatchRecord | null>;
  /**
   * List matches where the given user participates in the pair
   * (either side of the match).
   */
  listMatchesForUser(
    userId: UserId,
    limit?: number,
    offset?: number,
  ): Promise<MatchRecord[]>;
  save(record: MatchRecord): Promise<MatchRecord>;
  delete(id: MatchId): Promise<boolean>;
}
