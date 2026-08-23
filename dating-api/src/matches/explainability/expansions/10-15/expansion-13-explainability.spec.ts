import {
  buildExpansion13ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
  SHADOW_SIGNAL_DOMAIN,
} from './expansion-13-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion13ShadowBreakdown', () => {
  it('emits synthetic growthGrowsTogether when both growthMindset >= 7', () => {
    const breakdown = buildExpansion13ShadowBreakdown(
      { growthMindset: 8 },
      { growthMindset: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('growthGrowsTogether');
    expect(breakdown[0].pairScore).toBe(10);
  });

  it('emits synthetic growthGrowsTogether at boundary (both >= 7)', () => {
    const breakdown = buildExpansion13ShadowBreakdown(
      { growthMindset: 7 },
      { growthMindset: 7 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('growthGrowsTogether');
  });

  it('does not emit growth chip when both growthMindset are low', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { growthMindset: 2 },
        { growthMindset: 3 },
      ),
    ).toEqual([]);
  });

  it('does not emit growth chip on growth gap', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { growthMindset: 9 },
        { growthMindset: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit growth chip when one side is below 7', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { growthMindset: 6 },
        { growthMindset: 7 },
      ),
    ).toEqual([]);
  });

  it('does not emit growth chip when either side is null', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { growthMindset: 8 },
        { growthMindset: null },
      ),
    ).toEqual([]);
  });

  it('emits synthetic selfAwarenessMatch when both selfAwareness >= 7', () => {
    const breakdown = buildExpansion13ShadowBreakdown(
      { selfAwareness: 8 },
      { selfAwareness: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('selfAwarenessMatch');
    expect(breakdown[0].pairScore).toBe(10);
  });

  it('emits synthetic selfAwarenessMatch at boundary (both >= 7)', () => {
    const breakdown = buildExpansion13ShadowBreakdown(
      { selfAwareness: 7 },
      { selfAwareness: 7 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('selfAwarenessMatch');
  });

  it('does not emit awareness chip when both selfAwareness are low', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { selfAwareness: 2 },
        { selfAwareness: 3 },
      ),
    ).toEqual([]);
  });

  it('does not emit awareness chip when one side is below 7', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { selfAwareness: 6 },
        { selfAwareness: 7 },
      ),
    ).toEqual([]);
  });

  it('does not emit awareness chip when either side is null', () => {
    expect(
      buildExpansion13ShadowBreakdown(
        { selfAwareness: 8 },
        { selfAwareness: null },
      ),
    ).toEqual([]);
  });

  it('emits both chips when both signals are both-high', () => {
    const breakdown = buildExpansion13ShadowBreakdown(
      { growthMindset: 8, selfAwareness: 8 },
      { growthMindset: 9, selfAwareness: 9 },
    );
    expect(breakdown.map((e) => e.key)).toEqual([
      'growthGrowsTogether',
      'selfAwarenessMatch',
    ]);
  });

  it('exposes exact chip map labels and personal domains', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.growthGrowsTogether).toBe(
      'Grows together',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.selfAwarenessMatch).toBe(
      'Self-awareness match',
    );
    expect(SHADOW_SIGNAL_DOMAIN.growthGrowsTogether).toBe('personal');
    expect(SHADOW_SIGNAL_DOMAIN.selfAwarenessMatch).toBe('personal');
  });
});

describe('Expansion-13 shadow positive chips', () => {
  it('pickPositiveChips includes Grows together from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'growthGrowsTogether',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.growthGrowsTogether);
  });

  it('pickPositiveChips includes Self-awareness match from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'selfAwarenessMatch',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.selfAwarenessMatch);
  });
});
