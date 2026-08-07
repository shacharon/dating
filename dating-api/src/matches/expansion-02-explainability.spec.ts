import {
  buildExpansion02ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-02-explainability';
import { pickPositiveChips } from './match-explainability';

describe('buildExpansion02ShadowBreakdown', () => {
  it('builds entries with pairScore >= 7 when both sides are high', () => {
    const breakdown = buildExpansion02ShadowBreakdown(
      { emotionalRegulation: 8, physicalAffectionStyle: 7 },
      { emotionalRegulation: 8, physicalAffectionStyle: 7 },
    );
    expect(breakdown).toHaveLength(2);
    expect(breakdown.every((e) => e.pairScore >= 7)).toBe(true);
    expect(breakdown.map((e) => e.key).sort()).toEqual([
      'emotionalRegulation',
      'physicalAffectionStyle',
    ]);
  });

  it('skips keys when either side is null', () => {
    expect(
      buildExpansion02ShadowBreakdown(
        { emotionalRegulation: 8, physicalAffectionStyle: null },
        { emotionalRegulation: null, physicalAffectionStyle: 7 },
      ),
    ).toEqual([]);
  });

  it('skips non-finite values', () => {
    expect(
      buildExpansion02ShadowBreakdown(
        { emotionalRegulation: Number.NaN },
        { emotionalRegulation: 8 },
      ),
    ).toEqual([]);
  });
});

describe('Expansion-02 shadow positive chips', () => {
  it('pickPositiveChips includes Emotional balance from shadow-only high regulation', () => {
    const chips = pickPositiveChips([
      {
        key: 'emotionalRegulation',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.emotionalRegulation);
  });

  it('may include both shadow chips when both are high', () => {
    const chips = pickPositiveChips([
      {
        key: 'emotionalRegulation',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'physicalAffectionStyle',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain('Emotional balance');
    expect(chips).toContain('Affection rhythm match');
  });
});
