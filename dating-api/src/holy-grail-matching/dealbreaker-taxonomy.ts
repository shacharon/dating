/**
 * Closed, versioned dealbreaker/requirement topic taxonomy (v1).
 * Revives + extends the abandoned NEGATIVE_TAGS allowlist.
 * Source of truth for Story 17 classifiers — do not duplicate tag lists elsewhere.
 *
 * KEYWORD ENGINE FROZEN (Sprint 52 Story 02)
 * See docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 */

export const DEALBREAKER_TAXONOMY_VERSION = 'v1' as const;

export type DealbreakerCategory =
  | 'behavioral'
  | 'lifestyle'
  | 'values'
  | 'social';

/** NEUTRAL is conceptual only — never emitted as a signal row (tag absent). */
export type DealbreakerClassification =
  | 'HARD_EXCLUDE'
  | 'HARD_REQUIRE'
  | 'SOFT'
  | 'NEUTRAL';

export const DEALBREAKER_TAGS = {
  behavioral: [
    'smoking',
    'drugs',
    'excessive_drinking',
    'vaping',
    'only_non_smokers',
    'only_smokers',
    'only_non_drinkers',
    'only_non_vapers',
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

export const ALL_DEALBREAKER_TAGS = [
  ...DEALBREAKER_TAGS.behavioral,
  ...DEALBREAKER_TAGS.lifestyle,
  ...DEALBREAKER_TAGS.values,
  ...DEALBREAKER_TAGS.social,
] as const;

export type DealbreakerTag = (typeof ALL_DEALBREAKER_TAGS)[number];

export const DEALBREAKER_TAG_SET = new Set<string>(ALL_DEALBREAKER_TAGS);

export function isDealbreakerTag(x: string): x is DealbreakerTag {
  return DEALBREAKER_TAG_SET.has(x);
}

/** Alias tags that normalize to a base topic + classification (never double-emitted). */
export const DEALBREAKER_ALIAS_TO_BASE: Readonly<
  Partial<
    Record<
      DealbreakerTag,
      {
        readonly base: DealbreakerTag;
        readonly classification: Exclude<
          DealbreakerClassification,
          'NEUTRAL' | 'SOFT'
        >;
      }
    >
  >
> = {
  only_non_smokers: { base: 'smoking', classification: 'HARD_EXCLUDE' },
  only_smokers: { base: 'smoking', classification: 'HARD_REQUIRE' },
  only_non_drinkers: {
    base: 'excessive_drinking',
    classification: 'HARD_EXCLUDE',
  },
  only_non_vapers: { base: 'vaping', classification: 'HARD_EXCLUDE' },
};

export function dealbreakerCategoryForTag(
  tag: DealbreakerTag,
): DealbreakerCategory {
  if ((DEALBREAKER_TAGS.behavioral as readonly string[]).includes(tag)) {
    return 'behavioral';
  }
  if ((DEALBREAKER_TAGS.lifestyle as readonly string[]).includes(tag)) {
    return 'lifestyle';
  }
  if ((DEALBREAKER_TAGS.values as readonly string[]).includes(tag)) {
    return 'values';
  }
  return 'social';
}
