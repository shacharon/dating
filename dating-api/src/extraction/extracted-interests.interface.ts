/**
 * Profile interests / hobbies — explicit structured layer, separate from compatibility signals.
 * Versioned schema; tags reflect model output (canonical list is guidance for prompts/UI).
 * 
 * LLM-first extraction: interests are extracted via structured LLM output only.
 * No regex fallback, no deterministic inference, no hybrid mode.
 */

/** Re-export for consumers that import interests types from this module. */
export type { ExtractionDomain } from './extracted-signals.interface';

/** Canonical interest tags (stable ids for storage and APIs). */
export const INTEREST_CANONICAL_TAGS = [
  'art',
  'beach',
  'books',
  'cooking',
  'dancing',
  'football',
  'gaming',
  'gym',
  'hiking',
  'home_life',
  'movies',
  'music',
  'nightlife',
  'spirituality',
  'travel',
  'yoga',
] as const;

export type InterestCanonicalTag = (typeof INTEREST_CANONICAL_TAGS)[number];

export const INTEREST_CANONICAL_TAG_SET = new Set<string>(INTEREST_CANONICAL_TAGS);

/**
 * explicit: direct hobby/activity noun or clear "I love X" style (LLM-determined).
 * strong: clear habitual activity without fuzzy inference (LLM-determined).
 */
export type InterestStrength = 'explicit' | 'strong';

export interface InterestItem {
  /** Model output preserved (canonical when the model complies). */
  tag: string;
  strength: InterestStrength;
  /** Short evidence text from the original input (optional). */
  evidence?: string;
  /** Stable rule id for audits (e.g., "llm_v1"). */
  ruleId: string;
}

/** Interests extracted from a single domain (self, partner, or relationship). */
export interface DomainInterests {
  items: InterestItem[];
}

/** Raw interests schema: separate arrays per domain. */
export interface RawInterests {
  version: 'v1';
  self: InterestItem[];
  partner: InterestItem[];
  relationship: InterestItem[];
}

export interface ProfileTextsForInterests {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}
