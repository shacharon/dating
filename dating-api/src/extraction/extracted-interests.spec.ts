import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import {
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS,
} from './extracted-signals.interface';
import {
  INTEREST_CANONICAL_TAGS,
  INTEREST_CANONICAL_TAG_SET,
} from './extracted-interests.interface';

describe('INTEREST_CANONICAL_TAGS', () => {
  const expansion09Tags = ['biking', 'camping', 'nature'] as const;

  it('contains exactly 19 tags', () => {
    expect(INTEREST_CANONICAL_TAGS.length).toBe(19);
  });

  it('includes Expansion-09 taxonomy tags', () => {
    expect(INTEREST_CANONICAL_TAGS).toContain('biking');
    expect(INTEREST_CANONICAL_TAGS).toContain('camping');
    expect(INTEREST_CANONICAL_TAGS).toContain('nature');
  });

  it('keeps existing hobby tags', () => {
    expect(INTEREST_CANONICAL_TAGS).toContain('hiking');
    expect(INTEREST_CANONICAL_TAGS).toContain('travel');
    expect(INTEREST_CANONICAL_TAGS).toContain('gaming');
    expect(INTEREST_CANONICAL_TAGS).toContain('cooking');
    expect(INTEREST_CANONICAL_TAGS).toContain('movies');
    expect(INTEREST_CANONICAL_TAGS).toContain('dancing');
  });

  it('exposes Expansion-09 tags in INTEREST_CANONICAL_TAG_SET', () => {
    for (const tag of expansion09Tags) {
      expect(INTEREST_CANONICAL_TAG_SET.has(tag)).toBe(true);
    }
  });

  it('stays alphabetically ordered', () => {
    expect([...INTEREST_CANONICAL_TAGS]).toEqual(
      [...INTEREST_CANONICAL_TAGS].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('does not treat Expansion-09 tags as compatibility signals', () => {
    const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
    for (const tag of expansion09Tags) {
      expect(scored.has(tag)).toBe(false);
    }
  });

  it('does not treat Expansion-09 tags as extraction signal keys', () => {
    const official = new Set<string>(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
    const shadow = new Set<string>(SHADOW_SIGNAL_KEYS);
    for (const tag of expansion09Tags) {
      expect(official.has(tag)).toBe(false);
      expect(shadow.has(tag)).toBe(false);
    }
  });
});
