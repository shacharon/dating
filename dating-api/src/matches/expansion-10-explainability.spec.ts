import {
  buildExpansion10ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-10-explainability';
import { pickPositiveChips } from './match-explainability';

describe('buildExpansion10ShadowBreakdown', () => {
  it('builds entry with pairScore >= 7 when both sides are high on repairSkills', () => {
    const breakdown = buildExpansion10ShadowBreakdown(
      { repairSkills: 8 },
      { repairSkills: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('repairSkills');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('builds entry when both sides are high on forgivenessStyle', () => {
    const breakdown = buildExpansion10ShadowBreakdown(
      { forgivenessStyle: 8 },
      { forgivenessStyle: 8 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('forgivenessStyle');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('skips keys when either side is null', () => {
    expect(
      buildExpansion10ShadowBreakdown(
        { repairSkills: 8 },
        { repairSkills: null },
      ),
    ).toEqual([]);
  });

  it('skips non-finite values', () => {
    expect(
      buildExpansion10ShadowBreakdown(
        { repairSkills: Number.NaN },
        { repairSkills: 8 },
      ),
    ).toEqual([]);
  });

  it('exposes exact chip map labels', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.repairSkills).toBe(
      'Conflict recovery',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.forgivenessStyle).toBe(
      'Letting go & moving forward',
    );
  });
});

describe('Expansion-10 shadow positive chips', () => {
  it('pickPositiveChips includes Conflict recovery from shadow-only high repairSkills', () => {
    const chips = pickPositiveChips([
      {
        key: 'repairSkills',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.repairSkills);
  });

  it('pickPositiveChips includes Letting go & moving forward from high forgivenessStyle', () => {
    const chips = pickPositiveChips([
      {
        key: 'forgivenessStyle',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.forgivenessStyle);
  });
});
