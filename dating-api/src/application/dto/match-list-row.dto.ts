/**
 * Application DTO for listing matches (e.g. match history / list APIs).
 * No framework decorators.
 */

import type { MatchId } from '../../domain/matches/match.types';
import type { UserId } from '../../domain/users/user.types';

/** Explainability slice (display-only; mirrors engine DTO). */
export interface MatchExplainabilityRowDto {
  positiveChips: string[];
  tensionChip?: string;
  reasonShort: string;
}

/** One row in a match list response. */
export interface MatchListRowDto {
  id: MatchId;
  selfId: UserId;
  partnerId: UserId;
  overallDecisionScore?: number;
  partnerFitScore?: number;
  relationshipFitScore?: number;
  createdAt?: string;
  updatedAt?: string;
  explainability?: MatchExplainabilityRowDto;
}
