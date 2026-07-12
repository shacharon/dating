/**
 * @deprecated Use `holy-grail-matching/dealbreaker-taxonomy` +
 * `dealbreaker-signals-text.extract` instead. Tag lists are no longer
 * maintained here — re-exported from the single source of truth.
 *
 * Profile negatives / dealbreakers — explicit anti-preferences layer.
 * STRICT RULE: ONLY explicit negation evidence. NO inference.
 */

import {
  ALL_DEALBREAKER_TAGS,
  DEALBREAKER_TAGS,
  DEALBREAKER_TAG_SET,
  type DealbreakerCategory,
  type DealbreakerTag,
} from '../holy-grail-matching/dealbreaker-taxonomy';

/** @deprecated Use DealbreakerCategory from dealbreaker-taxonomy. */
export type NegativeCategory = DealbreakerCategory;

/** @deprecated Replaced by DealbreakerClassification (HARD_EXCLUDE | HARD_REQUIRE | SOFT). */
export type NegativeStrength = 'hard' | 'soft';

/** @deprecated Use DealbreakerSignal from dealbreaker-signals-text.extract. */
export interface NegativeItem {
  category: NegativeCategory;
  tag: string;
  strength: NegativeStrength;
  evidence: string;
  confidence: number;
}

/** @deprecated */
export interface DomainNegatives {
  domain: 'self' | 'partner' | 'relationship';
  items: NegativeItem[];
  version: 'v1';
}

/** @deprecated */
export interface ExtractedNegatives {
  version: 'v1';
  self: NegativeItem[];
  partner: NegativeItem[];
  relationship: NegativeItem[];
}

/**
 * @deprecated Use DEALBREAKER_TAGS — includes requirement counterparts.
 * Legacy shape kept for any stale imports; values are the live taxonomy.
 */
export const NEGATIVE_TAGS = DEALBREAKER_TAGS;

/** @deprecated Use ALL_DEALBREAKER_TAGS. */
export const ALL_NEGATIVE_TAGS = ALL_DEALBREAKER_TAGS;

/** @deprecated Use DealbreakerTag. */
export type NegativeTag = DealbreakerTag;

/** @deprecated Use DEALBREAKER_TAG_SET. */
export const NEGATIVE_TAG_SET = DEALBREAKER_TAG_SET;
