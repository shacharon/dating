import { compare } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { INTEREST_CANONICAL_TAGS } from '../../extraction/extracted-interests.interface';
import {
  makeProfile,
  makeProfileWithExpansion12Shadow,
  makeProfileWithExpansion13Shadow,
  makeProfileWithExpansion14Shadow,
  makeProfileWithExpansion15Shadow,
  makeSignals,
} from './match-engine.spec-support';

describe('match-engine expansion shadow (14-15)', () => {
describe('Expansion-14 shadow E2E via compare', () => {
  it('keeps Expansion-14 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of [
      'patienceTolerance',
      'intimacyPacing',
      'monogamyAlignment',
    ] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-14 keys are distinct from adjacent signals and interest tags', () => {
    for (const key of [
      'patienceTolerance',
      'intimacyPacing',
      'monogamyAlignment',
    ] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('patienceTolerance').not.toBe('conflictStyle');
    expect('patienceTolerance').not.toBe('emotionalRegulation');
    expect('intimacyPacing').not.toBe('casualIntimacyIntent');
    expect('monogamyAlignment').not.toBe('relationshipClarity');
  });

  it('patience_tolerance_gap surfaces Different tolerance levels', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { patienceTolerance: 9 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { patienceTolerance: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different tolerance levels');
    expect(
      result.tensionMatrix.some((t) => t.id === 'patience_tolerance_gap'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('intimacy_pacing_clash surfaces Different pace to closeness', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { intimacyPacing: 9 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { intimacyPacing: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Different pace to closeness',
    );
    expect(
      result.tensionMatrix.some((t) => t.id === 'intimacy_pacing_clash'),
    ).toBe(true);
  });

  it('monogamy_alignment_mismatch surfaces Relationship structure mismatch (dealbreaker)', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { monogamyAlignment: 2 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { monogamyAlignment: 9 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Relationship structure mismatch',
    );
    expect(
      result.tensionMatrix.some((t) => t.id === 'monogamy_alignment_mismatch'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(8);
  });

  it('includes Patience match when both patienceTolerance high', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { patienceTolerance: 8 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { patienceTolerance: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Patience match');
  });

  it('includes Pace of closeness when both intimacyPacing high (fast)', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { intimacyPacing: 8 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { intimacyPacing: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Pace of closeness');
  });

  it('includes Pace of closeness when both intimacyPacing low (slow)', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { intimacyPacing: 2 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { intimacyPacing: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Pace of closeness');
  });

  it('includes Aligned on relationship structure when both mono', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { monogamyAlignment: 2 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { monogamyAlignment: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Aligned on relationship structure',
    );
  });

  it('includes Aligned on relationship structure when both open', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { monogamyAlignment: 8 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { monogamyAlignment: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Aligned on relationship structure',
    );
  });

  it('does not include Patience match when both patienceTolerance critical/low', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { patienceTolerance: 2 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { patienceTolerance: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Patience match');
  });

  it('does not include Aligned on relationship structure for mono vs open', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { monogamyAlignment: 2 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { monogamyAlignment: 9 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain(
      'Aligned on relationship structure',
    );
  });

  it('excludes Expansion-14 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { patienceTolerance: 8 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { patienceTolerance: 8 },
    );
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Patience match' &&
          row.key !== 'Pace of closeness' &&
          row.key !== 'Aligned on relationship structure' &&
          row.key !== 'Patience with differences' &&
          row.key !== 'Relationship structure' &&
          !/patienceTolerance|intimacyPacing|monogamyAlignment/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips patience_tolerance_gap', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { patienceTolerance: 9 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { patienceTolerance: null },
    );
    const result = compare(a, b);
    expect(
      result.tensionMatrix.some((t) => t.id === 'patience_tolerance_gap'),
    ).toBe(false);
  });

  it('compatibility unchanged when only Expansion-14 shadow signals differ', () => {
    const highA = makeProfileWithExpansion14Shadow(
      'a1',
      'A1',
      {},
      {
        patienceTolerance: 8,
        intimacyPacing: 8,
        monogamyAlignment: 2,
      },
    );
    const highB = makeProfileWithExpansion14Shadow(
      'b1',
      'B1',
      {},
      {
        patienceTolerance: 8,
        intimacyPacing: 8,
        monogamyAlignment: 2,
      },
    );
    const gapA = makeProfileWithExpansion14Shadow(
      'a2',
      'A2',
      {},
      {
        patienceTolerance: 9,
        intimacyPacing: 9,
        monogamyAlignment: 2,
      },
    );
    const gapB = makeProfileWithExpansion14Shadow(
      'b2',
      'B2',
      {},
      {
        patienceTolerance: 2,
        intimacyPacing: 2,
        monogamyAlignment: 9,
      },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-13 non-regression: Different growth pace still surfaces', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { growthMindset: 9 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { growthMindset: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different growth pace');
  });

  it('Expansion-12 non-regression: Different listening styles still surfaces', () => {
    const a = makeProfileWithExpansion12Shadow(
      'a',
      'A',
      {},
      { listeningPresence: 9 },
    );
    const b = makeProfileWithExpansion12Shadow(
      'b',
      'B',
      {},
      { listeningPresence: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Different listening styles',
    );
  });
});

describe('Expansion-15 shadow E2E via compare', () => {
  it('keeps Expansion-15 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of [
      'familyEnmeshment',
      'friendCoupleBalance',
      'aloneTimeNeed',
    ] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-15 keys are distinct from adjacent signals and interest tags', () => {
    for (const key of [
      'familyEnmeshment',
      'friendCoupleBalance',
      'aloneTimeNeed',
    ] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('familyEnmeshment').not.toBe('traditionalism');
    expect('friendCoupleBalance').not.toBe('socialBattery');
    expect('aloneTimeNeed').not.toBe('independence');
  });

  it('family_enmeshment_gap surfaces Family involvement gap', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 9 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Family involvement gap');
    expect(
      result.tensionMatrix.some((t) => t.id === 'family_enmeshment_gap'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(4);
  });

  it('friend_couple_balance_gap surfaces Friends vs couple time', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { friendCoupleBalance: 9 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { friendCoupleBalance: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Friends vs couple time');
    expect(
      result.tensionMatrix.some((t) => t.id === 'friend_couple_balance_gap'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('alone_time_need_gap surfaces Different alone-time needs', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { aloneTimeNeed: 9 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { aloneTimeNeed: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Different alone-time needs',
    );
    expect(
      result.tensionMatrix.some((t) => t.id === 'alone_time_need_gap'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('includes Family style match when both familyEnmeshment high', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 8 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Family style match');
  });

  it('includes Family style match when both familyEnmeshment low', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 2 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Family style match');
  });

  it('includes Friends & couple balance when both couple-centric', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { friendCoupleBalance: 8 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { friendCoupleBalance: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Friends & couple balance',
    );
  });

  it('includes Friends & couple balance when both friends-first', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { friendCoupleBalance: 2 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { friendCoupleBalance: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Friends & couple balance',
    );
  });

  it('includes Recharge style match when both aloneTimeNeed high', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { aloneTimeNeed: 8 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { aloneTimeNeed: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Recharge style match',
    );
  });

  it('includes Recharge style match when both aloneTimeNeed low', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { aloneTimeNeed: 2 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { aloneTimeNeed: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Recharge style match',
    );
  });

  it('does not include Family style match on family tension pair', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 9 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain(
      'Family style match',
    );
  });

  it('does not include Family style match for mid/mid (not dual-band)', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 5 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: 5 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain(
      'Family style match',
    );
  });

  it('excludes Expansion-15 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 8 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: 8 },
    );
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Family style match' &&
          row.key !== 'Friends & couple balance' &&
          row.key !== 'Recharge style match' &&
          row.key !== 'Family closeness' &&
          row.key !== 'Alone time needs' &&
          !/familyEnmeshment|friendCoupleBalance|aloneTimeNeed/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips family_enmeshment_gap', () => {
    const a = makeProfileWithExpansion15Shadow(
      'a',
      'A',
      {},
      { familyEnmeshment: 9 },
    );
    const b = makeProfileWithExpansion15Shadow(
      'b',
      'B',
      {},
      { familyEnmeshment: null },
    );
    const result = compare(a, b);
    expect(
      result.tensionMatrix.some((t) => t.id === 'family_enmeshment_gap'),
    ).toBe(false);
  });

  it('compatibility unchanged when only Expansion-15 shadow signals differ', () => {
    const highA = makeProfileWithExpansion15Shadow(
      'a1',
      'A1',
      {},
      {
        familyEnmeshment: 8,
        friendCoupleBalance: 8,
        aloneTimeNeed: 8,
      },
    );
    const highB = makeProfileWithExpansion15Shadow(
      'b1',
      'B1',
      {},
      {
        familyEnmeshment: 8,
        friendCoupleBalance: 8,
        aloneTimeNeed: 8,
      },
    );
    const gapA = makeProfileWithExpansion15Shadow(
      'a2',
      'A2',
      {},
      {
        familyEnmeshment: 9,
        friendCoupleBalance: 9,
        aloneTimeNeed: 9,
      },
    );
    const gapB = makeProfileWithExpansion15Shadow(
      'b2',
      'B2',
      {},
      {
        familyEnmeshment: 2,
        friendCoupleBalance: 2,
        aloneTimeNeed: 2,
      },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-14 non-regression: Different tolerance levels still surfaces', () => {
    const a = makeProfileWithExpansion14Shadow(
      'a',
      'A',
      {},
      { patienceTolerance: 9 },
    );
    const b = makeProfileWithExpansion14Shadow(
      'b',
      'B',
      {},
      { patienceTolerance: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different tolerance levels');
  });
});

});
