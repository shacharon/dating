import {
  buildExpansion06ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-06-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion06ShadowBreakdown', () => {
  it('builds entry with pairScore >= 7 when both sides are high', () => {
    const breakdown = buildExpansion06ShadowBreakdown(
      { adventureNovelty: 8 },
      { adventureNovelty: 8 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('adventureNovelty');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('skips keys when either side is null', () => {
    expect(
      buildExpansion06ShadowBreakdown(
        { adventureNovelty: 8 },
        { adventureNovelty: null },
      ),
    ).toEqual([]);
  });

  it('skips non-finite values', () => {
    expect(
      buildExpansion06ShadowBreakdown(
        { adventureNovelty: Number.NaN },
        { adventureNovelty: 8 },
      ),
    ).toEqual([]);
  });
});

describe('Expansion-06 shadow positive chips', () => {
  it('pickPositiveChips includes Adventure & novelty from shadow-only high adventureNovelty', () => {
    const chips = pickPositiveChips([
      {
        key: 'adventureNovelty',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.adventureNovelty);
  });
});
