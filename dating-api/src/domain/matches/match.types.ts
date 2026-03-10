/**
 * POC domain types for the dating comparison system — matches and compatibility.
 * No framework decorators; imports shared types from compatibility layer.
 */

import type { CompatibilityResult } from '../../compatibility/compatibility-score';
import type { UserId } from '../users/user.types';
import type { ProductScores } from '../scoring/product-scores.types';

/** Unique identifier for a match (e.g. comparison run) in the system. */
export type MatchId = string;

/** Pair of users in a match (self vs partner). */
export interface MatchPair {
  selfId: UserId;
  partnerId: UserId;
}

/** Compatibility in both directions: self↔partner and self↔relationship. */
export interface DirectionalCompatibility {
  selfVsPartner: CompatibilityResult;
  selfVsRelationship: CompatibilityResult;
}

/** Stored match record: id, pair, compatibility, product scores, timestamps. */
export interface MatchRecord {
  id: MatchId;
  pair: MatchPair;
  compatibility: DirectionalCompatibility;
  productScores: ProductScores;
  createdAt?: Date;
  updatedAt?: Date;
}
