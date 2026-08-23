import {
  computeInterestAlignment,
  sharedInterestTags,
} from './interest-alignment';

describe('computeInterestAlignment', () => {
  it('returns 0 when both sides are empty', () => {
    expect(computeInterestAlignment([], [])).toBe(0);
  });

  it('returns 100 for identical single-tag sets', () => {
    expect(computeInterestAlignment(['hiking'], ['hiking'])).toBe(100);
  });

  it('returns 100 for identical multi-tag sets', () => {
    const tags = ['hiking', 'cooking', 'books'];
    expect(computeInterestAlignment(tags, tags)).toBe(100);
  });

  it('returns 0 for completely disjoint sets', () => {
    expect(computeInterestAlignment(['hiking', 'books'], ['cooking', 'gym'])).toBe(0);
  });

  it('handles partial overlap: 1 shared out of 3 total unique tags', () => {
    // A={hiking, books}, B={hiking, cooking} → inter=1, union=3 → jacc=1/3 → round(33.33)=33
    expect(computeInterestAlignment(['hiking', 'books'], ['hiking', 'cooking'])).toBe(33);
  });

  it('handles partial overlap: 2 shared out of 4 total unique tags', () => {
    // A={hiking, books, cooking}, B={hiking, books, gym} → inter=2, union=4 → 50
    expect(
      computeInterestAlignment(
        ['hiking', 'books', 'cooking'],
        ['hiking', 'books', 'gym'],
      ),
    ).toBe(50);
  });

  it('returns small floor when only one side has tags (k=1)', () => {
    // k=1 → round(10 * min(1, 1/5)) = round(2) = 2
    expect(computeInterestAlignment(['hiking'], [])).toBe(2);
    expect(computeInterestAlignment([], ['hiking'])).toBe(2);
  });

  it('returns small floor when only one side has tags (k=5)', () => {
    // k=5 → round(10 * min(1, 5/5)) = 10
    const five = ['hiking', 'books', 'cooking', 'gym', 'music'];
    expect(computeInterestAlignment(five, [])).toBe(10);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(computeInterestAlignment(['Hiking', ' cooking '], ['hiking', 'COOKING'])).toBe(100);
  });

  it('is deterministic (same inputs → same output)', () => {
    const a = ['hiking', 'books', 'travel'];
    const b = ['travel', 'cooking', 'books'];
    const first = computeInterestAlignment(a, b);
    const second = computeInterestAlignment(a, b);
    expect(first).toBe(second);
  });

  it('returns integer (no fractional output)', () => {
    const result = computeInterestAlignment(['a', 'b'], ['b', 'c']);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('result is always in [0, 100]', () => {
    const result = computeInterestAlignment(
      ['hiking', 'books', 'travel', 'cooking'],
      ['hiking', 'books'],
    );
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('sharedInterestTags', () => {
  it('returns empty for no overlap', () => {
    expect(sharedInterestTags(['hiking'], ['cooking'])).toEqual([]);
  });

  it('returns shared tags preserving original casing from A', () => {
    const shared = sharedInterestTags(['Hiking', 'books'], ['hiking', 'travel']);
    expect(shared).toEqual(['Hiking']);
  });

  it('deduplicates shared tags', () => {
    const shared = sharedInterestTags(['hiking', 'hiking'], ['hiking']);
    expect(shared).toHaveLength(1);
  });

  it('returns empty when either side is empty', () => {
    expect(sharedInterestTags([], ['hiking'])).toEqual([]);
    expect(sharedInterestTags(['hiking'], [])).toEqual([]);
  });
});
