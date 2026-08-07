import {
  buildExpansion07ShadowBreakdown,
  INTEREST_OVERLAP_CHIP_PREFERRED_TAGS,
  pickInterestOverlapTags,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-07-explainability';
import { pickPositiveChips } from './match-explainability';

describe('buildExpansion07ShadowBreakdown', () => {
  it('builds standalone entries when both sides are high', () => {
    const breakdown = buildExpansion07ShadowBreakdown(
      {
        casualIntimacyIntent: 8,
        supportExchangeOrientation: 8,
        religiousObservance: 8,
      },
      {
        casualIntimacyIntent: 8,
        supportExchangeOrientation: 8,
        religiousObservance: 8,
      },
    );
    expect(breakdown.map((e) => e.key)).toEqual(
      expect.arrayContaining([
        'casualIntimacyIntent',
        'supportExchangeOrientation',
        'religiousObservance',
      ]),
    );
    for (const e of breakdown.filter((x) =>
      [
        'casualIntimacyIntent',
        'supportExchangeOrientation',
        'religiousObservance',
      ].includes(x.key),
    )) {
      expect(e.pairScore).toBeGreaterThanOrEqual(7);
    }
  });

  it('skips standalone keys when either side is null', () => {
    expect(
      buildExpansion07ShadowBreakdown(
        { casualIntimacyIntent: 8 },
        { casualIntimacyIntent: null },
      ),
    ).toEqual([]);
  });

  it('adds Financial support alignment when exchange-open and provider↔recipient align', () => {
    const breakdown = buildExpansion07ShadowBreakdown(
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 9,
        supportRecipientOrientation: 2,
      },
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 2,
        supportRecipientOrientation: 9,
      },
    );
    expect(breakdown.some((e) => e.key === 'supportFinancialAlignment')).toBe(
      true,
    );
  });

  it('adds Non-transactional match when both reject exchange', () => {
    const breakdown = buildExpansion07ShadowBreakdown(
      { supportExchangeOrientation: 2 },
      { supportExchangeOrientation: 2 },
    );
    expect(breakdown.some((e) => e.key === 'supportNonTransactional')).toBe(
      true,
    );
  });

  it('does not add financial alignment when both are high providers', () => {
    const breakdown = buildExpansion07ShadowBreakdown(
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 9,
        supportRecipientOrientation: 2,
      },
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 9,
        supportRecipientOrientation: 2,
      },
    );
    expect(breakdown.some((e) => e.key === 'supportFinancialAlignment')).toBe(
      false,
    );
  });
});

describe('Expansion-07 shadow positive chips', () => {
  it('pickPositiveChips includes Intimacy expectations from shadow-only high casualIntimacyIntent', () => {
    const chips = pickPositiveChips([
      {
        key: 'casualIntimacyIntent',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.casualIntimacyIntent);
  });

  it('pickPositiveChips includes Financial support alignment from synthetic pair entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'supportFinancialAlignment',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(
      SHADOW_POSITIVE_CHIP_BY_SIGNAL.supportFinancialAlignment,
    );
  });

  it('pickPositiveChips includes Non-transactional match from synthetic pair entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'supportNonTransactional',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(
      SHADOW_POSITIVE_CHIP_BY_SIGNAL.supportNonTransactional,
    );
  });
});

describe('pickInterestOverlapTags', () => {
  it('prefers canonical overlap tags and caps at 2', () => {
    expect(pickInterestOverlapTags(['travel', 'books', 'xyz'])).toEqual([
      'travel',
      'books',
    ]);
  });

  it('fills from remaining shared tags after preferred', () => {
    expect(pickInterestOverlapTags(['gaming', 'travel'])).toEqual([
      'travel',
      'gaming',
    ]);
  });

  it('returns empty for no shared tags', () => {
    expect(pickInterestOverlapTags([])).toEqual([]);
  });

  it('prefers Expansion-09 biking over non-preferred gaming', () => {
    expect(pickInterestOverlapTags(['gaming', 'biking'])).toEqual([
      'biking',
      'gaming',
    ]);
  });

  it('picks two Expansion-09 preferred tags and caps at 2', () => {
    expect(pickInterestOverlapTags(['camping', 'nature', 'gaming'])).toEqual([
      'camping',
      'nature',
    ]);
  });

  it('caps three Expansion-09 preferred shared tags at 2', () => {
    const picked = pickInterestOverlapTags(['biking', 'camping', 'nature']);
    expect(picked).toEqual(['biking', 'camping']);
    expect(picked.length).toBeLessThanOrEqual(2);
  });

  it('exposes Expansion-09 tags on INTEREST_OVERLAP_CHIP_PREFERRED_TAGS', () => {
    expect(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS).toHaveLength(11);
    expect(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS).toContain('biking');
    expect(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS).toContain('camping');
    expect(INTEREST_OVERLAP_CHIP_PREFERRED_TAGS).toContain('nature');
  });
});
