import {
  buildExpansion14ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
  SHADOW_SIGNAL_DOMAIN,
} from './expansion-14-explainability';
import { pickPositiveChips } from './match-explainability';

describe('buildExpansion14ShadowBreakdown', () => {
  it('emits synthetic patienceMatch when both patienceTolerance >= 7', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      { patienceTolerance: 8 },
      { patienceTolerance: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('patienceMatch');
    expect(breakdown[0].pairScore).toBe(10);
  });

  it('emits synthetic patienceMatch at boundary (both >= 7)', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      { patienceTolerance: 7 },
      { patienceTolerance: 7 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('patienceMatch');
  });

  it('does not emit patience chip when both are low/critical', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { patienceTolerance: 2 },
        { patienceTolerance: 3 },
      ),
    ).toEqual([]);
  });

  it('does not emit patience chip on patience gap', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { patienceTolerance: 9 },
        { patienceTolerance: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit patience chip when one side is below 7', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { patienceTolerance: 6 },
        { patienceTolerance: 7 },
      ),
    ).toEqual([]);
  });

  it('does not emit patience chip when either side is null', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { patienceTolerance: 8 },
        { patienceTolerance: null },
      ),
    ).toEqual([]);
  });

  it('emits intimacyPaceAligned when both intimacyPacing >= 7', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      { intimacyPacing: 8 },
      { intimacyPacing: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('intimacyPaceAligned');
  });

  it('emits intimacyPaceAligned when both intimacyPacing <= 3', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      { intimacyPacing: 2 },
      { intimacyPacing: 3 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('intimacyPaceAligned');
  });

  it('does not emit pacing chip on pacing clash', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { intimacyPacing: 9 },
        { intimacyPacing: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit pacing chip for mid/mid (not dual-band)', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { intimacyPacing: 5 },
        { intimacyPacing: 5 },
      ),
    ).toEqual([]);
  });

  it('does not emit pacing chip when either side is null', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { intimacyPacing: 8 },
        { intimacyPacing: null },
      ),
    ).toEqual([]);
  });

  it('emits monogamyStructureAligned when both are mono (<= 2)', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      { monogamyAlignment: 2 },
      { monogamyAlignment: 1 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('monogamyStructureAligned');
  });

  it('emits monogamyStructureAligned when both are open (>= 7)', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      { monogamyAlignment: 8 },
      { monogamyAlignment: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('monogamyStructureAligned');
  });

  it('does not emit monogamy chip for mono vs open (tension territory)', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { monogamyAlignment: 2 },
        { monogamyAlignment: 9 },
      ),
    ).toEqual([]);
  });

  it('does not emit monogamy chip for soft-low both (3/3)', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { monogamyAlignment: 3 },
        { monogamyAlignment: 3 },
      ),
    ).toEqual([]);
  });

  it('does not emit monogamy chip when either side is null', () => {
    expect(
      buildExpansion14ShadowBreakdown(
        { monogamyAlignment: 2 },
        { monogamyAlignment: null },
      ),
    ).toEqual([]);
  });

  it('emits all three chips when all dual-band/high predicates pass', () => {
    const breakdown = buildExpansion14ShadowBreakdown(
      {
        patienceTolerance: 8,
        intimacyPacing: 2,
        monogamyAlignment: 1,
      },
      {
        patienceTolerance: 9,
        intimacyPacing: 3,
        monogamyAlignment: 2,
      },
    );
    expect(breakdown.map((e) => e.key)).toEqual([
      'patienceMatch',
      'intimacyPaceAligned',
      'monogamyStructureAligned',
    ]);
  });

  it('exposes exact chip map labels and domains', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.patienceMatch).toBe('Patience match');
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.intimacyPaceAligned).toBe(
      'Pace of closeness',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.monogamyStructureAligned).toBe(
      'Aligned on relationship structure',
    );
    expect(SHADOW_SIGNAL_DOMAIN.patienceMatch).toBe('relationship');
    expect(SHADOW_SIGNAL_DOMAIN.intimacyPaceAligned).toBe('intimacy');
    expect(SHADOW_SIGNAL_DOMAIN.monogamyStructureAligned).toBe('relationship');
  });
});

describe('Expansion-14 shadow positive chips', () => {
  it('pickPositiveChips includes Patience match from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'patienceMatch',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.patienceMatch);
  });

  it('pickPositiveChips includes Pace of closeness from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'intimacyPaceAligned',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.intimacyPaceAligned);
  });

  it('pickPositiveChips includes Aligned on relationship structure from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'monogamyStructureAligned',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(
      SHADOW_POSITIVE_CHIP_BY_SIGNAL.monogamyStructureAligned,
    );
  });
});
