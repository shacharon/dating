/**
 * Profile negatives / dealbreakers — explicit anti-preferences layer.
 * V2 extraction only; V1 does not extract negatives.
 * 
 * STRICT RULE: ONLY explicit negation evidence. NO inference.
 */

export type NegativeCategory = 'behavioral' | 'lifestyle' | 'values' | 'social';

export type NegativeStrength = 'hard' | 'soft';

export interface NegativeItem {
  category: NegativeCategory;
  tag: string;              // canonical tag (e.g., "smoking", "no_kids", "clingy")
  strength: NegativeStrength; // hard = dealbreaker, soft = preference
  evidence: string;         // exact quote from text
  confidence: number;       // 0-1
}

/** Negatives extracted from a single domain (self or partner). */
export interface DomainNegatives {
  domain: 'self' | 'partner' | 'relationship';
  items: NegativeItem[];
  version: 'v1';
}

/** Full negatives extraction result for all three domains. */
export interface ExtractedNegatives {
  version: 'v1';
  self: NegativeItem[];
  partner: NegativeItem[];
  relationship: NegativeItem[];
}

/** Canonical negative tags by category. */
export const NEGATIVE_TAGS = {
  behavioral: [
    'smoking',
    'drugs',
    'excessive_drinking',
    'vaping',
  ],
  lifestyle: [
    'no_kids',
    'kids_required',
    'no_pets',
    'pets_required',
    'no_remote_work',
    'must_be_local',
    'long_distance_impossible',
  ],
  values: [
    'political_incompatibility',
    'religious_incompatibility',
    'moral_incompatibility',
  ],
  social: [
    'jealousy',
    'control',
    'clingy',
    'drama',
    'emotional_unavailability',
    'commitment_phobic',
  ],
} as const;

export const ALL_NEGATIVE_TAGS = [
  ...NEGATIVE_TAGS.behavioral,
  ...NEGATIVE_TAGS.lifestyle,
  ...NEGATIVE_TAGS.values,
  ...NEGATIVE_TAGS.social,
] as const;

export type NegativeTag = (typeof ALL_NEGATIVE_TAGS)[number];

export const NEGATIVE_TAG_SET = new Set<string>(ALL_NEGATIVE_TAGS);
