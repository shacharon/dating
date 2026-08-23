import {
  buildExpansion04ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-04-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion04ShadowBreakdown', () => {
  it('builds entries with pairScore >= 7 when both sides are high', () => {
    const breakdown = buildExpansion04ShadowBreakdown(
      { intellectualCuriosity: 8, creativeExpression: 7 },
      { intellectualCuriosity: 8, creativeExpression: 7 },
    );
    expect(breakdown).toHaveLength(2);
    expect(breakdown.every((e) => e.pairScore >= 7)).toBe(true);
    expect(breakdown.map((e) => e.key).sort()).toEqual([
      'creativeExpression',
      'intellectualCuriosity',
    ]);
  });

  it('skips keys when either side is null', () => {
    expect(
      buildExpansion04ShadowBreakdown(
        { intellectualCuriosity: 8, creativeExpression: null },
        { intellectualCuriosity: null, creativeExpression: 7 },
      ),
    ).toEqual([]);
  });

  it('skips non-finite values', () => {
    expect(
      buildExpansion04ShadowBreakdown(
        { intellectualCuriosity: Number.NaN },
        { intellectualCuriosity: 8 },
      ),
    ).toEqual([]);
  });
});

describe('Expansion-04 shadow positive chips', () => {
  it('pickPositiveChips includes Mental stimulation from shadow-only high intellectualCuriosity', () => {
    const chips = pickPositiveChips([
      {
        key: 'intellectualCuriosity',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(
      SHADOW_POSITIVE_CHIP_BY_SIGNAL.intellectualCuriosity,
    );
  });

  it('pickPositiveChips includes Creative expression from shadow-only high creativeExpression', () => {
    const chips = pickPositiveChips([
      {
        key: 'creativeExpression',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.creativeExpression);
  });

  it('may include both shadow chips when both are high', () => {
    const chips = pickPositiveChips([
      {
        key: 'intellectualCuriosity',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'creativeExpression',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain('Mental stimulation');
    expect(chips).toContain('Creative expression');
  });
});
