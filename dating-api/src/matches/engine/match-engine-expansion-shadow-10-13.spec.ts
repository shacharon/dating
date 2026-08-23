import { compare } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { INTEREST_CANONICAL_TAGS } from '../../extraction/extracted-interests.interface';
import {
  makeProfile,
  makeProfileWithExpansion07Shadow,
  makeProfileWithExpansion10Shadow,
  makeProfileWithExpansion11Shadow,
  makeProfileWithExpansion12Shadow,
  makeProfileWithExpansion13Shadow,
  makeSignals,
} from './match-engine.spec-support';

describe('match-engine expansion shadow (10-13)', () => {
describe('Expansion-10 shadow E2E via compare', () => {
  it('keeps Expansion-10 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of ['repairSkills', 'forgivenessStyle'] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-10 keys are distinct from adjacent signals and interest tags', () => {
    for (const key of ['repairSkills', 'forgivenessStyle'] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('repairSkills').not.toBe('conflictStyle');
    expect('repairSkills').not.toBe('directness');
    expect('forgivenessStyle').not.toBe('emotionalRegulation');
    expect('forgivenessStyle').not.toBe('attachmentSecurity');
  });

  it('repair_skills_gap surfaces Different repair styles', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 9 });
    const b = makeProfileWithExpansion10Shadow('b', 'B', {}, { repairSkills: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different repair styles');
    expect(result.tensionMatrix.some((t) => t.id === 'repair_skills_gap')).toBe(
      true,
    );
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('both_low_repair surfaces Conflict recovery risk without repair_skills_gap', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 2 });
    const b = makeProfileWithExpansion10Shadow('b', 'B', {}, { repairSkills: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Conflict recovery risk');
    expect(result.tensionMatrix.some((t) => t.id === 'both_low_repair')).toBe(
      true,
    );
    expect(result.tensionMatrix.some((t) => t.id === 'repair_skills_gap')).toBe(
      false,
    );
  });

  it('forgiveness_style_gap surfaces Different forgiveness pace', () => {
    const a = makeProfileWithExpansion10Shadow(
      'a',
      'A',
      {},
      { forgivenessStyle: 9 },
    );
    const b = makeProfileWithExpansion10Shadow(
      'b',
      'B',
      {},
      { forgivenessStyle: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different forgiveness pace');
    expect(
      result.tensionMatrix.some((t) => t.id === 'forgiveness_style_gap'),
    ).toBe(true);
  });

  it('includes Conflict recovery positive chip when both repairSkills high', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 8 });
    const b = makeProfileWithExpansion10Shadow('b', 'B', {}, { repairSkills: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Conflict recovery');
  });

  it('includes Letting go & moving forward when both forgivenessStyle high', () => {
    const a = makeProfileWithExpansion10Shadow(
      'a',
      'A',
      {},
      { forgivenessStyle: 8 },
    );
    const b = makeProfileWithExpansion10Shadow(
      'b',
      'B',
      {},
      { forgivenessStyle: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Letting go & moving forward',
    );
  });

  it('excludes Expansion-10 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 8 });
    const b = makeProfileWithExpansion10Shadow('b', 'B', {}, { repairSkills: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Conflict recovery' &&
          row.key !== 'Letting go & moving forward' &&
          !/repairSkills|forgivenessStyle/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips repair tension rules', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 9 });
    const b = makeProfileWithExpansion10Shadow(
      'b',
      'B',
      {},
      { repairSkills: null },
    );
    const result = compare(a, b);
    expect(result.tensionMatrix.some((t) => t.id === 'repair_skills_gap')).toBe(
      false,
    );
    expect(result.tensionMatrix.some((t) => t.id === 'both_low_repair')).toBe(
      false,
    );
  });

  it('compatibility unchanged when only Expansion-10 shadow signals differ', () => {
    const highA = makeProfileWithExpansion10Shadow(
      'a1',
      'A1',
      {},
      { repairSkills: 8, forgivenessStyle: 8 },
    );
    const highB = makeProfileWithExpansion10Shadow(
      'b1',
      'B1',
      {},
      { repairSkills: 8, forgivenessStyle: 8 },
    );
    const gapA = makeProfileWithExpansion10Shadow(
      'a2',
      'A2',
      {},
      { repairSkills: 9, forgivenessStyle: 9 },
    );
    const gapB = makeProfileWithExpansion10Shadow(
      'b2',
      'B2',
      {},
      { repairSkills: 2, forgivenessStyle: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-07 non-regression: casual intimacy clash still surfaces', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      { casualIntimacyIntent: 9 },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      { casualIntimacyIntent: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Casual vs committed intimacy',
    );
  });

  it('Expansion-09 interest spot: shared biking/camping still overlap', () => {
    const a = makeProfileWithExpansion10Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const b = makeProfileWithExpansion10Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'biking',
      'camping',
    ]);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(
      2,
    );
  });
});

describe('Expansion-11 shadow E2E via compare', () => {
  it('keeps Expansion-11 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of ['stressResponse', 'jealousySecurity'] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-11 keys are distinct from adjacent signals and interest tags', () => {
    for (const key of ['stressResponse', 'jealousySecurity'] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('stressResponse').not.toBe('attachmentSecurity');
    expect('stressResponse').not.toBe('emotionalRegulation');
    expect('jealousySecurity').not.toBe('independence');
    expect('jealousySecurity').not.toBe('attachmentSecurity');
    expect('stressResponse').not.toBe('repairSkills');
    expect('jealousySecurity').not.toBe('repairSkills');
  });

  it('stress_response_clash surfaces Pursue vs withdraw under stress', () => {
    const a = makeProfileWithExpansion11Shadow('a', 'A', {}, { stressResponse: 9 });
    const b = makeProfileWithExpansion11Shadow('b', 'B', {}, { stressResponse: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Pursue vs withdraw under stress',
    );
    expect(
      result.tensionMatrix.some((t) => t.id === 'stress_response_clash'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('jealousy_security_gap surfaces Trust & space mismatch', () => {
    const a = makeProfileWithExpansion11Shadow(
      'a',
      'A',
      {},
      { jealousySecurity: 9 },
    );
    const b = makeProfileWithExpansion11Shadow(
      'b',
      'B',
      {},
      { jealousySecurity: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Trust & space mismatch');
    expect(
      result.tensionMatrix.some((t) => t.id === 'jealousy_security_gap'),
    ).toBe(true);
  });

  it('both_high_jealousy surfaces Shared jealousy risk without jealousy_security_gap', () => {
    const a = makeProfileWithExpansion11Shadow(
      'a',
      'A',
      {},
      { jealousySecurity: 9 },
    );
    const b = makeProfileWithExpansion11Shadow(
      'b',
      'B',
      {},
      { jealousySecurity: 9 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Shared jealousy risk');
    expect(result.tensionMatrix.some((t) => t.id === 'both_high_jealousy')).toBe(
      true,
    );
    expect(
      result.tensionMatrix.some((t) => t.id === 'jealousy_security_gap'),
    ).toBe(false);
    expect(result.explainability.positiveChips).not.toContain(
      'Secure & trusting',
    );
  });

  it('includes Support under pressure when both stressResponse high', () => {
    const a = makeProfileWithExpansion11Shadow('a', 'A', {}, { stressResponse: 8 });
    const b = makeProfileWithExpansion11Shadow('b', 'B', {}, { stressResponse: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Support under pressure',
    );
  });

  it('includes Secure & trusting when both jealousySecurity low', () => {
    const a = makeProfileWithExpansion11Shadow(
      'a',
      'A',
      {},
      { jealousySecurity: 2 },
    );
    const b = makeProfileWithExpansion11Shadow(
      'b',
      'B',
      {},
      { jealousySecurity: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Secure & trusting');
  });

  it('excludes Expansion-11 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion11Shadow('a', 'A', {}, { stressResponse: 8 });
    const b = makeProfileWithExpansion11Shadow('b', 'B', {}, { stressResponse: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Support under pressure' &&
          row.key !== 'Secure & trusting' &&
          !/stressResponse|jealousySecurity/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips stress_response_clash', () => {
    const a = makeProfileWithExpansion11Shadow('a', 'A', {}, { stressResponse: 9 });
    const b = makeProfileWithExpansion11Shadow(
      'b',
      'B',
      {},
      { stressResponse: null },
    );
    const result = compare(a, b);
    expect(
      result.tensionMatrix.some((t) => t.id === 'stress_response_clash'),
    ).toBe(false);
  });

  it('compatibility unchanged when only Expansion-11 shadow signals differ', () => {
    const highA = makeProfileWithExpansion11Shadow(
      'a1',
      'A1',
      {},
      { stressResponse: 8, jealousySecurity: 8 },
    );
    const highB = makeProfileWithExpansion11Shadow(
      'b1',
      'B1',
      {},
      { stressResponse: 8, jealousySecurity: 8 },
    );
    const gapA = makeProfileWithExpansion11Shadow(
      'a2',
      'A2',
      {},
      { stressResponse: 9, jealousySecurity: 9 },
    );
    const gapB = makeProfileWithExpansion11Shadow(
      'b2',
      'B2',
      {},
      { stressResponse: 2, jealousySecurity: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-10 non-regression: Different repair styles still surfaces', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 9 });
    const b = makeProfileWithExpansion10Shadow('b', 'B', {}, { repairSkills: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different repair styles');
  });

  it('Expansion-09 interest spot: shared biking/camping still overlap', () => {
    const a = makeProfileWithExpansion11Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const b = makeProfileWithExpansion11Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'biking',
      'camping',
    ]);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(
      2,
    );
  });
});

describe('Expansion-12 shadow E2E via compare', () => {
  it('keeps Expansion-12 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of ['listeningPresence', 'emotionalExpression'] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-12 keys are distinct from adjacent signals and interest tags', () => {
    for (const key of ['listeningPresence', 'emotionalExpression'] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('listeningPresence').not.toBe('empathyCompassion');
    expect('listeningPresence').not.toBe('directness');
    expect('emotionalExpression').not.toBe('emotionalDepth');
    expect('emotionalExpression').not.toBe('physicalAffectionStyle');
  });

  it('listening_presence_gap surfaces Different listening styles', () => {
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
    expect(result.explainability.tensionChip).toBe('Different listening styles');
    expect(
      result.tensionMatrix.some((t) => t.id === 'listening_presence_gap'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('emotional_expression_gap surfaces Different expression styles', () => {
    const a = makeProfileWithExpansion12Shadow(
      'a',
      'A',
      {},
      { emotionalExpression: 9 },
    );
    const b = makeProfileWithExpansion12Shadow(
      'b',
      'B',
      {},
      { emotionalExpression: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Different expression styles',
    );
    expect(
      result.tensionMatrix.some((t) => t.id === 'emotional_expression_gap'),
    ).toBe(true);
  });

  it('includes Feels heard when both listeningPresence high', () => {
    const a = makeProfileWithExpansion12Shadow(
      'a',
      'A',
      {},
      { listeningPresence: 8 },
    );
    const b = makeProfileWithExpansion12Shadow(
      'b',
      'B',
      {},
      { listeningPresence: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Feels heard');
  });

  it('includes Expressiveness match when both emotionalExpression high', () => {
    const a = makeProfileWithExpansion12Shadow(
      'a',
      'A',
      {},
      { emotionalExpression: 8 },
    );
    const b = makeProfileWithExpansion12Shadow(
      'b',
      'B',
      {},
      { emotionalExpression: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Expressiveness match',
    );
  });

  it('does not include Feels heard when both listeningPresence low', () => {
    const a = makeProfileWithExpansion12Shadow(
      'a',
      'A',
      {},
      { listeningPresence: 2 },
    );
    const b = makeProfileWithExpansion12Shadow(
      'b',
      'B',
      {},
      { listeningPresence: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Feels heard');
  });

  it('excludes Expansion-12 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion12Shadow(
      'a',
      'A',
      {},
      { listeningPresence: 8 },
    );
    const b = makeProfileWithExpansion12Shadow(
      'b',
      'B',
      {},
      { listeningPresence: 8 },
    );
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Feels heard' &&
          row.key !== 'Expressiveness match' &&
          row.key !== 'Quality listening' &&
          row.key !== 'Expressiveness' &&
          !/listeningPresence|emotionalExpression/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips listening_presence_gap', () => {
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
      { listeningPresence: null },
    );
    const result = compare(a, b);
    expect(
      result.tensionMatrix.some((t) => t.id === 'listening_presence_gap'),
    ).toBe(false);
  });

  it('compatibility unchanged when only Expansion-12 shadow signals differ', () => {
    const highA = makeProfileWithExpansion12Shadow(
      'a1',
      'A1',
      {},
      { listeningPresence: 8, emotionalExpression: 8 },
    );
    const highB = makeProfileWithExpansion12Shadow(
      'b1',
      'B1',
      {},
      { listeningPresence: 8, emotionalExpression: 8 },
    );
    const gapA = makeProfileWithExpansion12Shadow(
      'a2',
      'A2',
      {},
      { listeningPresence: 9, emotionalExpression: 9 },
    );
    const gapB = makeProfileWithExpansion12Shadow(
      'b2',
      'B2',
      {},
      { listeningPresence: 2, emotionalExpression: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-11 non-regression: Pursue vs withdraw under stress still surfaces', () => {
    const a = makeProfileWithExpansion11Shadow('a', 'A', {}, { stressResponse: 9 });
    const b = makeProfileWithExpansion11Shadow('b', 'B', {}, { stressResponse: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Pursue vs withdraw under stress',
    );
  });

  it('Expansion-10 non-regression: Different repair styles still surfaces', () => {
    const a = makeProfileWithExpansion10Shadow('a', 'A', {}, { repairSkills: 9 });
    const b = makeProfileWithExpansion10Shadow('b', 'B', {}, { repairSkills: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different repair styles');
  });
});

describe('Expansion-13 shadow E2E via compare', () => {
  it('keeps Expansion-13 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of ['growthMindset', 'selfAwareness'] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-13 keys are distinct from adjacent signals and interest tags', () => {
    for (const key of ['growthMindset', 'selfAwareness'] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('growthMindset').not.toBe('vulnerabilityOpenness');
    expect('growthMindset').not.toBe('directness');
    expect('selfAwareness').not.toBe('emotionalRegulation');
    expect('selfAwareness').not.toBe('empathyCompassion');
  });

  it('growth_mindset_gap surfaces Different growth pace', () => {
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
    expect(
      result.tensionMatrix.some((t) => t.id === 'growth_mindset_gap'),
    ).toBe(true);
    expect(result.friction).toBeGreaterThanOrEqual(3);
  });

  it('both_low_self_awareness surfaces Self-insight gap', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { selfAwareness: 2 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { selfAwareness: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Self-insight gap');
    expect(
      result.tensionMatrix.some((t) => t.id === 'both_low_self_awareness'),
    ).toBe(true);
  });

  it('includes Grows together when both growthMindset high', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { growthMindset: 8 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { growthMindset: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Grows together');
  });

  it('includes Self-awareness match when both selfAwareness high', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { selfAwareness: 8 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { selfAwareness: 8 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Self-awareness match',
    );
  });

  it('does not include Grows together when both growthMindset low', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { growthMindset: 2 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { growthMindset: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Grows together');
  });

  it('does not include Self-awareness match when both selfAwareness low', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { selfAwareness: 2 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { selfAwareness: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain(
      'Self-awareness match',
    );
  });

  it('excludes Expansion-13 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion13Shadow(
      'a',
      'A',
      {},
      { growthMindset: 8 },
    );
    const b = makeProfileWithExpansion13Shadow(
      'b',
      'B',
      {},
      { growthMindset: 8 },
    );
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Grows together' &&
          row.key !== 'Self-awareness match' &&
          row.key !== 'Openness to growth' &&
          row.key !== 'Self-awareness' &&
          !/growthMindset|selfAwareness/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips growth_mindset_gap', () => {
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
      { growthMindset: null },
    );
    const result = compare(a, b);
    expect(
      result.tensionMatrix.some((t) => t.id === 'growth_mindset_gap'),
    ).toBe(false);
  });

  it('compatibility unchanged when only Expansion-13 shadow signals differ', () => {
    const highA = makeProfileWithExpansion13Shadow(
      'a1',
      'A1',
      {},
      { growthMindset: 8, selfAwareness: 8 },
    );
    const highB = makeProfileWithExpansion13Shadow(
      'b1',
      'B1',
      {},
      { growthMindset: 8, selfAwareness: 8 },
    );
    const gapA = makeProfileWithExpansion13Shadow(
      'a2',
      'A2',
      {},
      { growthMindset: 9, selfAwareness: 9 },
    );
    const gapB = makeProfileWithExpansion13Shadow(
      'b2',
      'B2',
      {},
      { growthMindset: 2, selfAwareness: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
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

  it('Expansion-11 non-regression: Pursue vs withdraw under stress still surfaces', () => {
    const a = makeProfileWithExpansion11Shadow('a', 'A', {}, { stressResponse: 9 });
    const b = makeProfileWithExpansion11Shadow('b', 'B', {}, { stressResponse: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Pursue vs withdraw under stress',
    );
  });
});
});
