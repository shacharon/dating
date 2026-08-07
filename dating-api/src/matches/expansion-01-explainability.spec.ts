import {
  buildExpansion01ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-01-explainability';
import { pickPositiveChips } from './match-explainability';

describe('buildExpansion01ShadowBreakdown', () => {
  it('builds entries with pairScore >= 7 when both sides are high', () => {
    const breakdown = buildExpansion01ShadowBreakdown(
      { empathyCompassion: 8, vulnerabilityOpenness: 7 },
      { empathyCompassion: 8, vulnerabilityOpenness: 7 },
    );
    expect(breakdown).toHaveLength(2);
    expect(breakdown.every((e) => e.pairScore >= 7)).toBe(true);
    expect(breakdown.map((e) => e.key).sort()).toEqual([
      'empathyCompassion',
      'vulnerabilityOpenness',
    ]);
  });

  it('skips keys when either side is null', () => {
    expect(
      buildExpansion01ShadowBreakdown(
        { empathyCompassion: 8, vulnerabilityOpenness: null },
        { empathyCompassion: null, vulnerabilityOpenness: 7 },
      ),
    ).toEqual([]);
  });

  it('skips non-finite values', () => {
    expect(
      buildExpansion01ShadowBreakdown(
        { empathyCompassion: Number.NaN },
        { empathyCompassion: 8 },
      ),
    ).toEqual([]);
  });
});

describe('Expansion-01 shadow positive chips', () => {
  it('pickPositiveChips includes Understanding & care from shadow-only high empathy', () => {
    const chips = pickPositiveChips([
      {
        key: 'empathyCompassion',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.empathyCompassion);
  });

  it('may include both shadow chips when both are high', () => {
    const chips = pickPositiveChips([
      {
        key: 'empathyCompassion',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'vulnerabilityOpenness',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain('Understanding & care');
    expect(chips).toContain('Authentic openness');
  });
});
