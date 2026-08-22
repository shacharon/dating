import { compare } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { INTEREST_CANONICAL_TAGS } from '../extraction/extracted-interests.interface';
import {
  makeProfile,
  makeProfileWithExpansion02Shadow,
  makeProfileWithExpansion03Shadow,
  makeProfileWithExpansion04Shadow,
  makeProfileWithShadow,
  makeSignals,
} from './match-engine.spec-support';

describe('match-engine expansion shadow (01-04)', () => {
describe('Expansion-01 shadow E2E via compare', () => {
  it('keeps shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'empathyCompassion',
    );
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'vulnerabilityOpenness',
    );
  });

  it('empathy gap triggers Empathy mismatch tension chip when friction >= 3', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { empathyCompassion: 9 });
    const b = makeProfileWithShadow('b', 'B', {}, { empathyCompassion: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Empathy mismatch');
    expect(result.tensionMatrix.some((t) => t.id === 'empathy_gap')).toBe(true);
  });

  it('vulnerability mismatch triggers Openness vs walls tension chip', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { vulnerabilityOpenness: 8 });
    const b = makeProfileWithShadow('b', 'B', {}, { vulnerabilityOpenness: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Openness vs walls');
    expect(result.tensionMatrix.some((t) => t.id === 'vulnerability_mismatch')).toBe(
      true,
    );
  });

  it('high empathy on both sides surfaces Understanding & care positive chip', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { empathyCompassion: 8 });
    const b = makeProfileWithShadow('b', 'B', {}, { empathyCompassion: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Understanding & care');
  });

  it('high vulnerability on both sides surfaces Authentic openness positive chip', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { vulnerabilityOpenness: 8 });
    const b = makeProfileWithShadow('b', 'B', {}, { vulnerabilityOpenness: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Authentic openness');
  });

  it('excludes shadow keys from alignments DTO', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { empathyCompassion: 8 });
    const b = makeProfileWithShadow('b', 'B', {}, { empathyCompassion: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every((row) => !/empathy|vulnerability/i.test(row.key)),
    ).toBe(true);
  });

  it('null shadow on one side skips empathy chip and empathy_gap tension', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { empathyCompassion: 8 });
    const b = makeProfileWithShadow('b', 'B', {}, { empathyCompassion: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain(
      'Understanding & care',
    );
    expect(result.tensionMatrix.some((t) => t.id === 'empathy_gap')).toBe(false);
  });

  it('compatibility unchanged when only shadow signals differ', () => {
    const highA = makeProfileWithShadow('a1', 'A1', {}, { empathyCompassion: 8 });
    const highB = makeProfileWithShadow('b1', 'B1', {}, { empathyCompassion: 8 });
    const gapA = makeProfileWithShadow('a2', 'A2', {}, { empathyCompassion: 9 });
    const gapB = makeProfileWithShadow('b2', 'B2', {}, { empathyCompassion: 2 });
    const highResult = compare(highA, highB);
    const gapResult = compare(gapA, gapB);
    expect(gapResult.compatibility).toBe(highResult.compatibility);
  });
});

describe('Expansion-02 shadow E2E via compare', () => {
  it('keeps Expansion-02 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'emotionalRegulation',
    );
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'physicalAffectionStyle',
    );
  });

  it('regulation gap triggers Emotional steadiness gap tension chip when friction >= 3', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { emotionalRegulation: 9 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { emotionalRegulation: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Emotional steadiness gap');
    expect(result.tensionMatrix.some((t) => t.id === 'emotional_volatility_gap')).toBe(
      true,
    );
  });

  it('affection gap triggers Different affection needs tension chip', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { physicalAffectionStyle: 8 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { physicalAffectionStyle: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Different affection needs');
    expect(result.tensionMatrix.some((t) => t.id === 'affection_needs_gap')).toBe(true);
  });

  it('high regulation on both sides surfaces Emotional balance positive chip', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { emotionalRegulation: 8 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { emotionalRegulation: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Emotional balance');
  });

  it('high affection on both sides surfaces Affection rhythm match positive chip', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { physicalAffectionStyle: 8 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { physicalAffectionStyle: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Affection rhythm match');
  });

  it('excludes Expansion-02 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { emotionalRegulation: 8 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { emotionalRegulation: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Emotional Regulation' &&
          row.key !== 'Physical Affection Style',
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips regulation chip and emotional_volatility_gap tension', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { emotionalRegulation: 8 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { emotionalRegulation: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Emotional balance');
    expect(result.tensionMatrix.some((t) => t.id === 'emotional_volatility_gap')).toBe(
      false,
    );
  });

  it('compatibility unchanged when only Expansion-02 shadow signals differ', () => {
    const highA = makeProfileWithExpansion02Shadow('a1', 'A1', {}, { emotionalRegulation: 8 });
    const highB = makeProfileWithExpansion02Shadow('b1', 'B1', {}, { emotionalRegulation: 8 });
    const gapA = makeProfileWithExpansion02Shadow('a2', 'A2', {}, { emotionalRegulation: 9 });
    const gapB = makeProfileWithExpansion02Shadow('b2', 'B2', {}, { emotionalRegulation: 2 });
    const highResult = compare(highA, highB);
    const gapResult = compare(gapA, gapB);
    expect(gapResult.compatibility).toBe(highResult.compatibility);
  });

  it('Expansion-01 empathy gap tension still works (non-regression)', () => {
    const a = makeProfileWithShadow('a', 'A', {}, { empathyCompassion: 9 });
    const b = makeProfileWithShadow('b', 'B', {}, { empathyCompassion: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Empathy mismatch');
  });
});

describe('Expansion-03 shadow E2E via compare', () => {
  it('keeps Expansion-03 shadow key out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'humorPlayfulness',
    );
  });

  it('playfulness gap triggers Playfulness mismatch tension chip when friction >= 3', () => {
    const a = makeProfileWithExpansion03Shadow('a', 'A', {}, { humorPlayfulness: 9 });
    const b = makeProfileWithExpansion03Shadow('b', 'B', {}, { humorPlayfulness: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Playfulness mismatch');
    expect(result.tensionMatrix.some((t) => t.id === 'humor_mismatch')).toBe(true);
  });

  it('playfulness gap triggers tension chip in reverse direction', () => {
    const a = makeProfileWithExpansion03Shadow('a', 'A', {}, { humorPlayfulness: 2 });
    const b = makeProfileWithExpansion03Shadow('b', 'B', {}, { humorPlayfulness: 9 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Playfulness mismatch');
    expect(result.tensionMatrix.some((t) => t.id === 'humor_mismatch')).toBe(true);
  });

  it('high playfulness on both sides surfaces Shared playfulness positive chip', () => {
    const a = makeProfileWithExpansion03Shadow('a', 'A', {}, { humorPlayfulness: 8 });
    const b = makeProfileWithExpansion03Shadow('b', 'B', {}, { humorPlayfulness: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Shared playfulness');
  });

  it('excludes Expansion-03 shadow key from alignments DTO', () => {
    const a = makeProfileWithExpansion03Shadow('a', 'A', {}, { humorPlayfulness: 8 });
    const b = makeProfileWithExpansion03Shadow('b', 'B', {}, { humorPlayfulness: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) => row.key !== 'Humor Playfulness' && !/humor|playfulness/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips playfulness chip and humor_mismatch tension', () => {
    const a = makeProfileWithExpansion03Shadow('a', 'A', {}, { humorPlayfulness: 8 });
    const b = makeProfileWithExpansion03Shadow('b', 'B', {}, { humorPlayfulness: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Shared playfulness');
    expect(result.tensionMatrix.some((t) => t.id === 'humor_mismatch')).toBe(false);
  });

  it('compatibility unchanged when only Expansion-03 shadow signals differ', () => {
    const highA = makeProfileWithExpansion03Shadow('a1', 'A1', {}, { humorPlayfulness: 8 });
    const highB = makeProfileWithExpansion03Shadow('b1', 'B1', {}, { humorPlayfulness: 8 });
    const gapA = makeProfileWithExpansion03Shadow('a2', 'A2', {}, { humorPlayfulness: 9 });
    const gapB = makeProfileWithExpansion03Shadow('b2', 'B2', {}, { humorPlayfulness: 2 });
    const highResult = compare(highA, highB);
    const gapResult = compare(gapA, gapB);
    expect(gapResult.compatibility).toBe(highResult.compatibility);
  });

  it('Expansion-02 regulation gap tension still works (non-regression)', () => {
    const a = makeProfileWithExpansion02Shadow('a', 'A', {}, { emotionalRegulation: 9 });
    const b = makeProfileWithExpansion02Shadow('b', 'B', {}, { emotionalRegulation: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Emotional steadiness gap');
  });
});

describe('Expansion-04 shadow E2E via compare', () => {
  it('keeps Expansion-04 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'intellectualCuriosity',
    );
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'creativeExpression',
    );
  });

  it('Expansion-04 signal keys are not interest tags', () => {
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'intellectualCuriosity',
    );
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'creativeExpression',
    );
  });

  it('intellectual gap triggers Different mental stimulation needs tension chip', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { intellectualCuriosity: 9 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { intellectualCuriosity: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe(
      'Different mental stimulation needs',
    );
    expect(result.tensionMatrix.some((t) => t.id === 'intellectual_gap')).toBe(true);
  });

  it('creative mismatch fires in friction matrix without requiring solo tensionChip', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { creativeExpression: 9 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { creativeExpression: 1 });
    const result = compare(a, b);
    expect(result.tensionMatrix.some((t) => t.id === 'creative_mismatch')).toBe(true);
    // penalty 2 alone is below friction gate (>=3) for tensionChip
    expect(result.friction).toBeLessThan(3);
  });

  it('high intellectualCuriosity on both sides surfaces Mental stimulation positive chip', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { intellectualCuriosity: 8 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { intellectualCuriosity: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Mental stimulation');
  });

  it('high creativeExpression on both sides surfaces Creative expression positive chip', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { creativeExpression: 8 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { creativeExpression: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Creative expression');
  });

  it('excludes Expansion-04 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { intellectualCuriosity: 8 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { intellectualCuriosity: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Intellectual Curiosity' &&
          row.key !== 'Creative Expression' &&
          row.key !== 'Mental stimulation' &&
          row.key !== 'Creative expression' &&
          !/intellectual|creative/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips intellectual chip and intellectual_gap tension', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { intellectualCuriosity: 8 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { intellectualCuriosity: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Mental stimulation');
    expect(result.tensionMatrix.some((t) => t.id === 'intellectual_gap')).toBe(false);
  });

  it('compatibility unchanged when only Expansion-04 shadow signals differ', () => {
    const highA = makeProfileWithExpansion04Shadow(
      'a1',
      'A1',
      {},
      { intellectualCuriosity: 8 },
    );
    const highB = makeProfileWithExpansion04Shadow(
      'b1',
      'B1',
      {},
      { intellectualCuriosity: 8 },
    );
    const gapA = makeProfileWithExpansion04Shadow(
      'a2',
      'A2',
      {},
      { intellectualCuriosity: 9 },
    );
    const gapB = makeProfileWithExpansion04Shadow(
      'b2',
      'B2',
      {},
      { intellectualCuriosity: 2 },
    );
    const highResult = compare(highA, highB);
    const gapResult = compare(gapA, gapB);
    expect(gapResult.compatibility).toBe(highResult.compatibility);
  });

  it('Expansion-03 playfulness gap tension still works (non-regression)', () => {
    const a = makeProfileWithExpansion03Shadow('a', 'A', {}, { humorPlayfulness: 9 });
    const b = makeProfileWithExpansion03Shadow('b', 'B', {}, { humorPlayfulness: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Playfulness mismatch');
  });

  it('interest tags and Expansion-04 shadow chips coexist independently', () => {
    const a = makeProfileWithExpansion04Shadow(
      'a',
      'A',
      {},
      { intellectualCuriosity: 8 },
      50,
      ['books', 'art'],
    );
    const b = makeProfileWithExpansion04Shadow(
      'b',
      'B',
      {},
      { intellectualCuriosity: 8 },
      50,
      ['books', 'art'],
    );
    const result = compare(a, b);
    expect(result.interestAlignment).toBe(100);
    expect(result.explainability.sharedInterestNote).toBeDefined();
    expect(result.explainability.positiveChips).toContain('Mental stimulation');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('books');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('art');
  });
});
});
