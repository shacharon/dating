import {
  buildExpansion05ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-05-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion05ShadowBreakdown', () => {
  it('builds entries with pairScore >= 7 when both sides are high', () => {
    const breakdown = buildExpansion05ShadowBreakdown(
      { physicalActivityLevel: 8, domesticComfort: 7 },
      { physicalActivityLevel: 8, domesticComfort: 7 },
    );
    expect(breakdown).toHaveLength(2);
    expect(breakdown.every((e) => e.pairScore >= 7)).toBe(true);
    expect(breakdown.map((e) => e.key).sort()).toEqual([
      'domesticComfort',
      'physicalActivityLevel',
    ]);
  });

  it('skips keys when either side is null', () => {
    expect(
      buildExpansion05ShadowBreakdown(
        { physicalActivityLevel: 8, domesticComfort: null },
        { physicalActivityLevel: null, domesticComfort: 7 },
      ),
    ).toEqual([]);
  });

  it('skips non-finite values', () => {
    expect(
      buildExpansion05ShadowBreakdown(
        { physicalActivityLevel: Number.NaN },
        { physicalActivityLevel: 8 },
      ),
    ).toEqual([]);
  });
});

describe('Expansion-05 shadow positive chips', () => {
  it('pickPositiveChips includes Activity level match from shadow-only high physicalActivityLevel', () => {
    const chips = pickPositiveChips([
      {
        key: 'physicalActivityLevel',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(
      SHADOW_POSITIVE_CHIP_BY_SIGNAL.physicalActivityLevel,
    );
  });

  it('pickPositiveChips includes Home/out balance from shadow-only high domesticComfort', () => {
    const chips = pickPositiveChips([
      {
        key: 'domesticComfort',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.domesticComfort);
  });

  it('may include both shadow chips when both are high', () => {
    const chips = pickPositiveChips([
      {
        key: 'physicalActivityLevel',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'domesticComfort',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain('Activity level match');
    expect(chips).toContain('Home/out balance');
  });
});
