import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { INTEREST_OVERLAP_CHIP_PREFERRED_TAGS } from '../../matches/explainability/expansions/01-07/expansion-07-explainability';
import {
  INTEREST_CANONICAL_TAGS,
  INTEREST_CANONICAL_TAG_SET,
} from '../extracted-interests.interface';
import {
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS,
} from '../extracted-signals.interface';
import { INTEREST_CANONICAL_TAGS_PROMPT_LIST } from './expansion-09-interest-guidance';

describe('Expansion-09 rollout gate', () => {
  const expansion09Tags = ['biking', 'camping', 'nature'] as const;

  const hobbyCoverage: Record<string, string> = {
    Games: 'gaming',
    Cooking: 'cooking',
    Nature: 'nature',
    Dancing: 'dancing',
    Travelling: 'travel',
    Biking: 'biking',
    Camping: 'camping',
    Movies: 'movies',
  };

  it('keeps INTEREST_CANONICAL_TAGS length at 19', () => {
    expect(INTEREST_CANONICAL_TAGS.length).toBe(19);
  });

  it('includes Expansion-09 and prior hobby tags', () => {
    for (const tag of expansion09Tags) {
      expect(INTEREST_CANONICAL_TAGS).toContain(tag);
      expect(INTEREST_CANONICAL_TAG_SET.has(tag)).toBe(true);
    }
    for (const tag of [
      'gaming',
      'cooking',
      'dancing',
      'travel',
      'movies',
      'hiking',
    ]) {
      expect(INTEREST_CANONICAL_TAGS).toContain(tag);
    }
  });

  it('does not treat Expansion-09 tags as scored or extraction signals', () => {
    const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
    const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
    const shadow = new Set<string>(SHADOW_SIGNAL_KEYS);
    for (const tag of expansion09Tags) {
      expect(scored.has(tag)).toBe(false);
      expect(official.has(tag)).toBe(false);
      expect(shadow.has(tag)).toBe(false);
    }
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
  });

  it('exposes Expansion-09 tags on INTEREST_OVERLAP_CHIP_PREFERRED_TAGS (11)', () => {
    expect(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS).toHaveLength(11);
    for (const tag of expansion09Tags) {
      expect(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS).toContain(tag);
    }
  });

  it('includes Expansion-09 tags in INTEREST_CANONICAL_TAGS_PROMPT_LIST SoT', () => {
    for (const tag of expansion09Tags) {
      expect(INTEREST_CANONICAL_TAGS_PROMPT_LIST).toContain(tag);
    }
  });

  it('covers hobby checklist 8/8 via canonical tags', () => {
    const mapped = Object.values(hobbyCoverage);
    expect(mapped).toHaveLength(8);
    for (const tag of mapped) {
      expect(INTEREST_CANONICAL_TAG_SET.has(tag)).toBe(true);
    }
  });
});
