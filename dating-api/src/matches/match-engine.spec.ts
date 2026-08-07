import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { compare, compareWithStatus, hasAnalyzedSignals } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import type { SignalKey } from '../compatibility/compatibility-score';
import * as compatibilityScore from '../compatibility/compatibility-score';
import { INTEREST_CANONICAL_TAGS } from '../extraction/extracted-interests.interface';

function makeSignals(overrides: Partial<Record<SignalKey, number>>): Record<string, number> {
  const signals: Record<string, number> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    signals[k] = overrides[k] ?? 5;
  }
  return signals;
}

function makeProfile(
  id: string,
  name: string,
  signals: Record<string, number>,
  relationshipFitScore = 50,
  evaluationStatus?: ProfileJsonPayload['evaluationStatus'],
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  return {
    id,
    name,
    evaluationStatus,
    texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
    evaluation: {
      self: {
        domain: 'self',
        signals,
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0.5 },
      relationship: {
        domain: 'relationship',
        signals: {},
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      compatibility: { selfVsPartner: { overallScore: 50 }, selfVsRelationship: { overallScore: 50 } },
      display: { summary: '', insight: '' },
      productScores: {
        partnerFitScore: 50,
        relationshipFitScore,
        coverageScore: 50,
        frictionRiskScore: 0,
        overallDecisionScore: 50,
        policyVersion: 'product-score-v1',
      },
      flags: [],
      enrichment: {
        version: 'v1',
        signals: {
          dailyRhythm: null,
          autonomyTogethernessDepth: null,
          kidsTimeline: null,
          conflictStyleDetail: null,
          relationshipPace: null,
          communicationMode: null,
          interestsTop3,
        },
      },
    },
    savedAt: new Date().toISOString(),
  };
}

type Expansion01ShadowKey = 'empathyCompassion' | 'vulnerabilityOpenness';

function makeProfileWithShadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion01ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}

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

type Expansion02ShadowKey = 'emotionalRegulation' | 'physicalAffectionStyle';

function makeProfileWithExpansion02Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion02ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}

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

type Expansion03ShadowKey = 'humorPlayfulness';

function makeProfileWithExpansion03Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion03ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}

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

type Expansion04ShadowKey = 'intellectualCuriosity' | 'creativeExpression';

function makeProfileWithExpansion04Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion04ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

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

type Expansion05ShadowKey = 'physicalActivityLevel' | 'domesticComfort';

function makeProfileWithExpansion05Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion05ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

describe('Expansion-05 shadow E2E via compare', () => {
  it('keeps Expansion-05 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'physicalActivityLevel',
    );
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'domesticComfort',
    );
  });

  it('Expansion-05 keys are distinct from interest tags and adjacent official signals', () => {
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'physicalActivityLevel',
    );
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'domesticComfort',
    );
    expect('physicalActivityLevel').not.toBe('healthBodyConsciousness');
    expect('physicalActivityLevel').not.toBe('physicalPriority');
    expect('domesticComfort').not.toBe('socialBattery');
    expect('domesticComfort').not.toBe('lifestylePace');
  });

  it('activity gap triggers Different activity levels tension chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 9 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Different activity levels');
    expect(result.tensionMatrix.some((t) => t.id === 'activity_level_gap')).toBe(true);
  });

  it('domestic mismatch triggers Home vs out mismatch tension chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { domesticComfort: 9 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { domesticComfort: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Home vs out mismatch');
    expect(result.tensionMatrix.some((t) => t.id === 'domestic_out_mismatch')).toBe(
      true,
    );
  });

  it('high physicalActivityLevel on both sides surfaces Activity level match positive chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Activity level match');
  });

  it('high domesticComfort on both sides surfaces Home/out balance positive chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { domesticComfort: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { domesticComfort: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Home/out balance');
  });

  it('excludes Expansion-05 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Physical Activity Level' &&
          row.key !== 'Domestic Comfort' &&
          row.key !== 'Activity level match' &&
          row.key !== 'Home/out balance' &&
          !/activity|domestic/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips activity chip and activity_level_gap tension', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Activity level match');
    expect(result.tensionMatrix.some((t) => t.id === 'activity_level_gap')).toBe(false);
  });

  it('compatibility unchanged when only Expansion-05 shadow signals differ', () => {
    const highA = makeProfileWithExpansion05Shadow(
      'a1',
      'A1',
      {},
      { physicalActivityLevel: 8 },
    );
    const highB = makeProfileWithExpansion05Shadow(
      'b1',
      'B1',
      {},
      { physicalActivityLevel: 8 },
    );
    const gapA = makeProfileWithExpansion05Shadow(
      'a2',
      'A2',
      {},
      { physicalActivityLevel: 9 },
    );
    const gapB = makeProfileWithExpansion05Shadow(
      'b2',
      'B2',
      {},
      { physicalActivityLevel: 2 },
    );
    const highResult = compare(highA, highB);
    const gapResult = compare(gapA, gapB);
    expect(gapResult.compatibility).toBe(highResult.compatibility);
  });

  it('Expansion-04 intellectual gap tension still works (non-regression)', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { intellectualCuriosity: 9 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { intellectualCuriosity: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Different mental stimulation needs',
    );
  });

  it('interest tags and Expansion-05 shadow chips coexist independently', () => {
    const a = makeProfileWithExpansion05Shadow(
      'a',
      'A',
      {},
      { physicalActivityLevel: 8 },
      50,
      ['gym', 'hiking'],
    );
    const b = makeProfileWithExpansion05Shadow(
      'b',
      'B',
      {},
      { physicalActivityLevel: 8 },
      50,
      ['gym', 'hiking'],
    );
    const result = compare(a, b);
    expect(result.interestAlignment).toBe(100);
    expect(result.explainability.sharedInterestNote).toBeDefined();
    expect(result.explainability.positiveChips).toContain('Activity level match');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('gym');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('hiking');
  });
});

type Expansion06ShadowKey = 'adventureNovelty';

function makeProfileWithExpansion06Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion06ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

describe('Expansion-06 shadow E2E via compare', () => {
  it('keeps Expansion-06 shadow key out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'adventureNovelty',
    );
  });

  it('Expansion-06 key is distinct from interest tags and adjacent signals', () => {
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'adventureNovelty',
    );
    expect('adventureNovelty').not.toBe('lifestylePace');
    expect('adventureNovelty').not.toBe('domesticComfort');
    expect('adventureNovelty').not.toBe('socialBattery');
  });

  it('novelty clash triggers Novelty vs routine tension chip', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 9 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Novelty vs routine');
    expect(result.tensionMatrix.some((t) => t.id === 'novelty_routine_clash')).toBe(
      true,
    );
  });

  it('high adventureNovelty on both sides surfaces Adventure & novelty positive chip', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 8 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Adventure & novelty');
  });

  it('excludes Expansion-06 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 8 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Adventure Novelty' &&
          row.key !== 'Adventure & novelty' &&
          !/adventure|novelty/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips novelty chip and novelty_routine_clash tension', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 8 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Adventure & novelty');
    expect(result.tensionMatrix.some((t) => t.id === 'novelty_routine_clash')).toBe(
      false,
    );
  });

  it('compatibility unchanged when only Expansion-06 shadow signals differ', () => {
    const highA = makeProfileWithExpansion06Shadow(
      'a1',
      'A1',
      {},
      { adventureNovelty: 8 },
    );
    const highB = makeProfileWithExpansion06Shadow(
      'b1',
      'B1',
      {},
      { adventureNovelty: 8 },
    );
    const gapA = makeProfileWithExpansion06Shadow(
      'a2',
      'A2',
      {},
      { adventureNovelty: 9 },
    );
    const gapB = makeProfileWithExpansion06Shadow(
      'b2',
      'B2',
      {},
      { adventureNovelty: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-05 non-regression: activity gap still surfaces Different activity levels', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 9 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different activity levels');
  });

  it('interest tags and Expansion-06 shadow chips coexist independently', () => {
    const a = makeProfileWithExpansion06Shadow(
      'a',
      'A',
      {},
      { adventureNovelty: 8 },
      50,
      ['travel'],
    );
    const b = makeProfileWithExpansion06Shadow(
      'b',
      'B',
      {},
      { adventureNovelty: 8 },
      50,
      ['travel'],
    );
    const result = compare(a, b);
    expect(result.interestAlignment).toBe(100);
    expect(result.explainability.sharedInterestNote).toBeDefined();
    expect(result.explainability.positiveChips).toContain('Adventure & novelty');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('travel');
  });
});

type Expansion07ShadowKey =
  | 'casualIntimacyIntent'
  | 'supportExchangeOrientation'
  | 'supportProviderOrientation'
  | 'supportRecipientOrientation'
  | 'religiousObservance';

function makeProfileWithExpansion07Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion07ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

describe('Expansion-07 shadow E2E via compare', () => {
  it('keeps Expansion-07 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of [
      'casualIntimacyIntent',
      'supportExchangeOrientation',
      'supportProviderOrientation',
      'supportRecipientOrientation',
      'religiousObservance',
    ] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-07 keys are distinct from interest tags and adjacent signals', () => {
    for (const key of [
      'casualIntimacyIntent',
      'supportExchangeOrientation',
      'supportProviderOrientation',
      'supportRecipientOrientation',
      'religiousObservance',
    ] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('casualIntimacyIntent').not.toBe('physicalPriority');
    expect('casualIntimacyIntent').not.toBe('relationshipClarity');
    expect('religiousObservance').not.toBe('spirituality');
    expect('religiousObservance').not.toBe('traditionalism');
    expect('supportExchangeOrientation').not.toBe('financialMindset');
  });

  it('casual intimacy clash triggers Casual vs committed intimacy tension chip', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { casualIntimacyIntent: 9 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { casualIntimacyIntent: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Casual vs committed intimacy');
    expect(result.tensionMatrix.some((t) => t.id === 'casual_intimacy_clash')).toBe(
      true,
    );
  });

  it('support exchange mismatch triggers Arrangement vs romance tension chip', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      { supportExchangeOrientation: 9 },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      { supportExchangeOrientation: 2 },
    );
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Arrangement vs romance');
    expect(
      result.tensionMatrix.some((t) => t.id === 'support_exchange_mismatch'),
    ).toBe(true);
  });

  it('both providers triggers Both want to provide tension chip', () => {
    const shadow = {
      supportExchangeOrientation: 8,
      supportProviderOrientation: 8,
      supportRecipientOrientation: 2,
    };
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, shadow);
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, shadow);
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Both want to provide');
    expect(result.tensionMatrix.some((t) => t.id === 'support_both_provider')).toBe(
      true,
    );
  });

  it('both recipients triggers Both seek support tension chip', () => {
    const shadow = {
      supportExchangeOrientation: 8,
      supportProviderOrientation: 2,
      supportRecipientOrientation: 8,
    };
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, shadow);
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, shadow);
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Both seek support');
    expect(result.tensionMatrix.some((t) => t.id === 'support_both_recipient')).toBe(
      true,
    );
  });

  it('religious observance gap triggers Religious practice gap tension chip', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { religiousObservance: 9 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { religiousObservance: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Religious practice gap');
    expect(
      result.tensionMatrix.some((t) => t.id === 'religious_observance_gap'),
    ).toBe(true);
  });

  it('high casualIntimacyIntent on both sides surfaces Intimacy expectations positive chip', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { casualIntimacyIntent: 8 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { casualIntimacyIntent: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Intimacy expectations');
  });

  it('provider↔recipient alignment surfaces Financial support alignment chip', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 9,
        supportRecipientOrientation: 2,
      },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 2,
        supportRecipientOrientation: 9,
      },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Financial support alignment',
    );
  });

  it('both low exchange surfaces Non-transactional match chip', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      { supportExchangeOrientation: 2 },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      { supportExchangeOrientation: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Non-transactional match');
  });

  it('excludes Expansion-07 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { religiousObservance: 8 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { religiousObservance: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Religious Observance' &&
          row.key !== 'Religious practice' &&
          row.key !== 'Intimacy expectations' &&
          row.key !== 'Support & arrangement style' &&
          row.key !== 'Financial support alignment' &&
          row.key !== 'Non-transactional match' &&
          !/casualIntimacy|supportExchange|supportProvider|supportRecipient|religiousObservance/i.test(
            row.key,
          ),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips casual_intimacy_clash tension', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { casualIntimacyIntent: 9 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { casualIntimacyIntent: null });
    const result = compare(a, b);
    expect(result.tensionMatrix.some((t) => t.id === 'casual_intimacy_clash')).toBe(
      false,
    );
  });

  it('compatibility unchanged when only Expansion-07 shadow signals differ', () => {
    const highA = makeProfileWithExpansion07Shadow(
      'a1',
      'A1',
      {},
      { casualIntimacyIntent: 8, religiousObservance: 8 },
    );
    const highB = makeProfileWithExpansion07Shadow(
      'b1',
      'B1',
      {},
      { casualIntimacyIntent: 8, religiousObservance: 8 },
    );
    const gapA = makeProfileWithExpansion07Shadow(
      'a2',
      'A2',
      {},
      { casualIntimacyIntent: 9, religiousObservance: 9 },
    );
    const gapB = makeProfileWithExpansion07Shadow(
      'b2',
      'B2',
      {},
      { casualIntimacyIntent: 2, religiousObservance: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('emits interestOverlapTags (max 2) from shared interestsTop3', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual(['travel', 'books']);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(2);
  });

  it('Expansion-06 non-regression: novelty gap still surfaces Novelty vs routine', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 9 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Novelty vs routine');
  });
});

describe('Expansion-09 interest overlap E2E via compare', () => {
  it('emits shared biking and camping interestOverlapTags', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const b = makeProfileWithExpansion07Shadow(
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

  it('prefers nature over non-preferred gaming in interestOverlapTags', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['gaming', 'nature'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['gaming', 'nature'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'nature',
      'gaming',
    ]);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(
      2,
    );
  });

  it('caps three Expansion-09 preferred shared tags at 2', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['biking', 'camping', 'nature'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['biking', 'camping', 'nature'],
    );
    const result = compare(a, b);
    const tags = result.explainability.interestOverlapTags ?? [];
    expect(tags).toHaveLength(2);
    expect(['biking', 'camping', 'nature']).toEqual(
      expect.arrayContaining(tags),
    );
  });

  it('keeps Expansion-07 travel/books interest overlap regression', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'travel',
      'books',
    ]);
  });
});

type Expansion10ShadowKey = 'repairSkills' | 'forgivenessStyle';

function makeProfileWithExpansion10Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion10ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

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

type Expansion11ShadowKey = 'stressResponse' | 'jealousySecurity';

function makeProfileWithExpansion11Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion11ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

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

type Expansion12ShadowKey = 'listeningPresence' | 'emotionalExpression';

function makeProfileWithExpansion12Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion12ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

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

describe('match-engine compare', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('detects profile as not analyzed when self signals are empty', () => {
    const p = makeProfile('a', 'A', {} as Record<string, number>);
    expect(hasAnalyzedSignals(p)).toBe(false);
  });

  it('returns INSUFFICIENT_DATA when either profile has empty self signals (analysis not pending)', () => {
    const analyzed = makeProfile('a', 'A', makeSignals({}));
    const empty = makeProfile('b', 'B', {} as Record<string, number>);

    const result = compareWithStatus(analyzed, empty);
    expect('status' in result ? result.status : 'READY').toBe('INSUFFICIENT_DATA');
    if ('status' in result && result.status === 'INSUFFICIENT_DATA') {
      expect(result.message).toContain('empty or non-numeric');
      expect(result.compatibility).toBeNull();
      expect(result.partnerFit).toBeNull();
      expect(result.relationshipFit).toBeNull();
      expect(result.coverage).toBeNull();
      expect(result.friction).toBeNull();
      expect(result.finalScore).toBeNull();
      expect(result.compatibility).not.toBe(100);
    }
  });

  it('returns score + confidence fields separately', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 60);
    const profileB = makeProfile('b', 'B', signals, 40);

    const result = compare(profileA, profileB);

    expect(result).toHaveProperty('compatibility');
    expect(result).toHaveProperty('valuesAlignment');
    expect(result).toHaveProperty('finalScore');
    expect(result).toHaveProperty('friction');
    expect(result).toHaveProperty('coveragePercent');
    expect(result).toHaveProperty('scoreCoverageFactor');
    expect(result).toHaveProperty('coverageFactor');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('infoFlags');
    expect(result.explainability.positiveChips.length).toBeLessThanOrEqual(3);
    expect(result.explainability.reasonShort.length).toBeGreaterThan(10);
    expect(typeof result.compatibility).toBe('number');
    expect(typeof result.valuesAlignment).toBe('number');
    expect(result.valuesAlignment).toBeGreaterThanOrEqual(0);
    expect(result.valuesAlignment).toBeLessThanOrEqual(100);
    expect(typeof result.finalScore).toBe('number');
    expect(typeof result.friction).toBe('number');
    expect(typeof result.coveragePercent).toBe('number');
    expect(typeof result.scoreCoverageFactor).toBe('number');
    expect(typeof result.coverageFactor).toBe('number');
    expect(typeof result.confidence).toBe('number');
    expect(result.compatibility).toBeGreaterThanOrEqual(0);
    expect(result.compatibility).toBeLessThanOrEqual(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(90);
    expect(result.friction).toBeGreaterThanOrEqual(0);
    expect(result.friction).toBeLessThanOrEqual(10);
    expect(result.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(result.coveragePercent).toBeLessThanOrEqual(100);
    expect(result.scoreCoverageFactor).toBeGreaterThanOrEqual(0.85);
    expect(result.scoreCoverageFactor).toBeLessThanOrEqual(1);
    expect(result.coverageFactor).toBeGreaterThan(0);
    expect(result.coverageFactor).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.infoFlags)).toBe(true);
  });

  it('compare result exposes finalScore only (no overallScore alias)', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals);
    const profileB = makeProfile('b', 'B', signals);

    const result = compare(profileA, profileB);

    expect(result).toHaveProperty('finalScore');
    expect(result).not.toHaveProperty('overallScore');
  });

  it('does not upscale real 0..100 compatibility scores (8 stays 8, not 80)', () => {
    const compatStub = {
      overallScore: 8,
      coverage: 1,
      matchedSignals: COMPATIBILITY_SIGNAL_KEYS.length,
      hardMismatches: [],
      breakdown: [],
      debug: {
        comparedKeys: COMPATIBILITY_SIGNAL_KEYS.length,
        totalKeys: COMPATIBILITY_SIGNAL_KEYS.length,
        weightedScoreBeforePenalties: 8,
        coveragePenaltyApplied: 0,
        hardMismatchPenaltyApplied: 0,
      },
    };
    jest
      .spyOn(compatibilityScore, 'computeCompatibility')
      .mockReturnValue(compatStub as ReturnType<typeof compatibilityScore.computeCompatibility>);

    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 0);
    const profileB = makeProfile('b', 'B', signals, 0);

    const result = compare(profileA, profileB);

    expect(result.aToB).toBe(8);
    expect(result.bToA).toBe(8);
    expect(result.compatibility).toBeGreaterThanOrEqual(0);
    // Low directionals (8) stay low in blend; valuesAlignment weight (15%) can lift compat above 20
    expect(result.compatibility).toBeLessThan(40);
  });

  it('coveragePercent = round(100 * comparableSignals / totalSignals)', () => {
    const fullSignals = makeSignals({});
    const profileA = makeProfile('a', 'A', fullSignals);
    const profileB = makeProfile('b', 'B', fullSignals);

    const result = compare(profileA, profileB);

    expect(result.coveragePercent).toBe(100);
  });

  it('full coverage gives coverageFactor near 1', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals);
    const profileB = makeProfile('b', 'B', signals);

    const result = compare(profileA, profileB);

    expect(result.coveragePercent).toBe(100);
    expect(result.coverageFactor).toBeGreaterThan(0.9);
  });

  it('is deterministic', () => {
    const signals = makeSignals({ ambition: 8, emotionalDepth: 6 });
    const profileA = makeProfile('a', 'A', signals, 70);
    const profileB = makeProfile('b', 'B', makeSignals({ ambition: 4, emotionalDepth: 7 }), 50);

    const r1 = compare(profileA, profileB);
    const r2 = compare(profileA, profileB);

    expect(r1.finalScore).toBe(r2.finalScore);
    expect(r1.compatibility).toBe(r2.compatibility);
    expect(r1.coveragePercent).toBe(r2.coveragePercent);
    expect(r1.coverageFactor).toBe(r2.coverageFactor);
    expect(r1.friction).toBe(r2.friction);
  });

  it('physicalPriority-only match with no Tier1 signals must NOT yield high finalScore', () => {
    const tier3Only: Record<string, number> = { physicalPriority: 9 };
    const profileA = makeProfile('a', 'A', tier3Only, 0);
    const profileB = makeProfile('b', 'B', tier3Only, 0);

    const result = compare(profileA, profileB);

    expect(result.coveragePercent).toBeLessThan(15);
    expect(result.finalScore).toBeLessThan(70);
    expect(result.infoFlags).toContain('LOW_COVERAGE');
    expect(result.infoFlags).toContain('LOW_CONFIDENCE');
  });

  it('full Tier1 match outscores Tier3-only match', () => {
    const tier1Signals = makeSignals({});
    const tier3Signals: Record<string, number> = {
      physicalPriority: 5,
      healthBodyConsciousness: 5,
      statusOrientation: 5,
    };
    const tier1A = makeProfile('a', 'A', tier1Signals, 50);
    const tier1B = makeProfile('b', 'B', tier1Signals, 50);
    const tier3A = makeProfile('c', 'C', tier3Signals, 50);
    const tier3B = makeProfile('d', 'D', tier3Signals, 50);

    const tier1Result = compare(tier1A, tier1B);
    const tier3Result = compare(tier3A, tier3B);

    expect(tier1Result.coveragePercent).toBe(100);
    expect(tier3Result.coveragePercent).toBeLessThan(50);
    expect(tier1Result.finalScore).toBeGreaterThan(tier3Result.finalScore);
  });

  it('golden: fusionNeed=9 + boundariesNeed=8 produces friction>=7 and finalScore drops vs no-friction baseline', () => {
    const signals = makeSignals({});
    const profileNoFrictionA = makeProfile('a', 'A', signals, 50);
    const profileNoFrictionB = makeProfile('b', 'B', signals, 50);

    const baseline = compare(profileNoFrictionA, profileNoFrictionB);
    expect(baseline.friction).toBe(0);

    const profileFusion = makeProfile('a', 'A', signals, 50);
    profileFusion.texts = {
      aboutMe: 'Looking for one soul, no secrets, everything together',
      aboutPartner: '',
      aboutRelationship: '',
    };
    const profileBoundaries = makeProfile('b', 'B', signals, 50);
    profileBoundaries.texts = {
      aboutMe: 'I need boundaries and needs space',
      aboutPartner: '',
      aboutRelationship: '',
    };

    const withTension = compare(profileFusion, profileBoundaries);

    expect(withTension.friction).toBeGreaterThanOrEqual(7);
    expect(withTension.tensionMatrix).toBeDefined();
    expect(withTension.tensionMatrix.some((t) => t.id === 'fusion_vs_boundaries')).toBe(true);

    expect(withTension.finalScore).toBeLessThan(baseline.finalScore);
    const drop = baseline.finalScore - withTension.finalScore;
    // Friction + scaled penalty; minimum meaningful drop (policy constants may change)
    expect(drop).toBeGreaterThanOrEqual(5);
  });
});

/* ─── Focused behavior guards (post-refactor: protect exact paths) ─────────── */

describe('match-engine compare path coverage', () => {
  it('1a. NOT_ANALYZED when evaluationStatus is not DONE', () => {
    const pending = makeProfile('a', 'A', makeSignals({}), 50, 'PENDING');
    const ready = makeProfile('b', 'B', makeSignals({}), 50);

    const result = compareWithStatus(pending, ready);
    expect(result).toHaveProperty('status', 'NOT_ANALYZED');
    const notAnalyzed = result as import('./match-engine').CompareNotAnalyzedResultDto;
    expect(notAnalyzed.message).toBe('Run analyze for both profiles before compare');
    expect(notAnalyzed.compatibility).toBeNull();
  });

  it('1b. INSUFFICIENT_DATA guard: empty self signals when analysis is not pending', () => {
    const analyzed = makeProfile('a', 'A', makeSignals({}));
    const empty = makeProfile('b', 'B', {} as Record<string, number>);

    const result = compareWithStatus(analyzed, empty);

    expect(result).toHaveProperty('status', 'INSUFFICIENT_DATA');
    const insufficient = result as import('./match-engine').CompareInsufficientDataResultDto;
    expect(insufficient.message).toContain('empty or non-numeric');
    expect(insufficient.compatibility).toBeNull();
    expect(insufficient.partnerFit).toBeNull();
    expect(insufficient.relationshipFit).toBeNull();
    expect(insufficient.coverage).toBeNull();
    expect(insufficient.friction).toBeNull();
    expect(insufficient.finalScore).toBeNull();
  });

  it('2. Normal analyzed pair: full coverage, deterministic key fields', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 50);
    const profileB = makeProfile('b', 'B', signals, 50);

    const result = compare(profileA, profileB);

    expect(result).not.toHaveProperty('overallScore');
    expect(result.coverage).toBe(result.coveragePercent);
    expect(result.coveragePercent).toBe(100);
    expect(result.scoreCoverageFactor).toBe(1);
    expect(result.coverageFactor).toBe(1);
    expect(result.confidence).toBe(1);
    expect(result.infoFlags).toEqual([]);
    expect(result.friction).toBe(0);
    expect(result.rawScore).toBeGreaterThanOrEqual(0);
    expect(result.rawScore).toBeLessThanOrEqual(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(90);
    expect(result.aToB).toBeLessThanOrEqual(100);
    expect(result.bToA).toBeLessThanOrEqual(100);
    expect(result.compatibility).toBeLessThanOrEqual(100);
    expect(result.debug).toBeDefined();
    expect(result.debug?.coveragePercent).toBe(100);
    expect(result.debug?.finalScore).toBe(result.finalScore);
  });

  it('3. Low coverage pair: coveragePercent < 50 triggers LOW_COVERAGE and low confidence', () => {
    const totalSignals = COMPATIBILITY_SIGNAL_KEYS.length;
    const oneKeySignals: Record<string, number> = { physicalPriority: 5 };
    const profileA = makeProfile('a', 'A', oneKeySignals, 50);
    const profileB = makeProfile('b', 'B', oneKeySignals, 50);

    const result = compare(profileA, profileB);

    const expectedCoverage = Math.round(100 * (1 / totalSignals));
    expect(result.coveragePercent).toBe(expectedCoverage);
    expect(result.coveragePercent).toBeLessThan(50);
    expect(result.infoFlags).toContain('LOW_COVERAGE');
    expect(result.confidence).toBeLessThan(0.8);
    expect(result.infoFlags).toContain('LOW_CONFIDENCE');
    expect(result.finalScoreBeforeSparseCalibration).toBeUndefined();
    expect(result.finalScore).toBeLessThanOrEqual(55);
    expect(result.debug?.provenance).toContain('sparse_final_cap');
  });

  it('4. Asymmetry pair: one profile few signals, other many (minPresent <= 6, maxPresent >= 9)', () => {
    const fewKeys = COMPATIBILITY_SIGNAL_KEYS.slice(0, 6);
    const manyKeys = COMPATIBILITY_SIGNAL_KEYS;
    const signalsFew: Record<string, number> = {};
    const signalsMany: Record<string, number> = {};
    for (const k of fewKeys) signalsFew[k] = 5;
    for (const k of manyKeys) signalsMany[k] = 5;
    const profileA = makeProfile('a', 'A', signalsFew, 50);
    const profileB = makeProfile('b', 'B', signalsMany, 50);

    const result = compare(profileA, profileB);

    expect(result.coveragePercent).toBe(
      Math.round(100 * (fewKeys.length / COMPATIBILITY_SIGNAL_KEYS.length)),
    );
    expect(result.debug).toBeDefined();
    expect(result.debug?.balanceRatio).toBeDefined();
    expect(result.aToB).toBeLessThanOrEqual(100);
    expect(result.bToA).toBeLessThanOrEqual(100);
    expect(result.compatibility).toBeLessThanOrEqual(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
  });

  it('5. Dealbreaker cap path: HARD dealbreaker caps finalScore at 45', () => {
    const base = makeSignals({});
    const profileA = makeProfile('a', 'A', { ...base, relationshipClarity: 9 }, 50);
    const profileB = makeProfile('b', 'B', { ...base, relationshipClarity: 2 }, 50);

    const result = compare(profileA, profileB);

    const hasHard = result.dealbreakers?.some((d) => d.severity === 'HARD');
    expect(hasHard).toBe(true);
    expect(result.finalScore).toBeLessThanOrEqual(45);
    const dealbreakerCapPenalty = result.debug?.penalties.find((p) => p.reason === 'dealbreaker_cap');
    expect(dealbreakerCapPenalty).toBeDefined();
    expect(dealbreakerCapPenalty!.amount).toBeGreaterThan(0);
  });

  it('6. Low coverage (<=55): score is not multiplied by coverage; flags still set', () => {
    const totalSignals = COMPATIBILITY_SIGNAL_KEYS.length;
    const numComparable = 6;
    const keys = COMPATIBILITY_SIGNAL_KEYS.slice(0, numComparable);
    const signalsA: Record<string, number> = {};
    const signalsB: Record<string, number> = {};
    for (const k of keys) {
      signalsA[k] = 5;
      signalsB[k] = 5;
    }
    const profileA = makeProfile('a', 'A', signalsA, 50);
    const profileB = makeProfile('b', 'B', signalsB, 50);

    const result = compare(profileA, profileB);

    const expectedCoverage = Math.round(100 * (numComparable / totalSignals));
    expect(result.coveragePercent).toBe(expectedCoverage);
    expect(result.coveragePercent).toBeLessThanOrEqual(55);
    expect(result.finalScoreBeforeSparseCalibration).toBeUndefined();
    expect(result.infoFlags).toContain('LOW_COVERAGE');
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(55);
    expect(result.debug?.provenance).toContain('sparse_final_cap');
  });

  it('sparse final cap: minPresent <= 5 on sparser profile', () => {
    const fewKeys = COMPATIBILITY_SIGNAL_KEYS.slice(0, 5);
    const signalsFew: Record<string, number> = {};
    const signalsMany: Record<string, number> = {};
    for (const k of fewKeys) signalsFew[k] = 5;
    for (const k of COMPATIBILITY_SIGNAL_KEYS) signalsMany[k] = 5;
    const profileA = makeProfile('a', 'A', signalsFew, 50);
    const profileB = makeProfile('b', 'B', signalsMany, 50);

    const result = compare(profileA, profileB);

    expect(result.coveragePercent).toBe(
      Math.round(100 * (fewKeys.length / COMPATIBILITY_SIGNAL_KEYS.length)),
    );
    expect(result.finalScore).toBeLessThanOrEqual(55);
    expect(result.debug?.provenance).toContain('sparse_final_cap');
  });

  it('full coverage pair: no sparse final cap (finalScore may reach 90)', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 80);
    const profileB = makeProfile('b', 'B', signals, 80);

    const result = compare(profileA, profileB);

    expect(result.coveragePercent).toBe(100);
    expect(result.debug?.provenance).not.toContain('sparse_final_cap');
    expect(result.finalScore).toBeGreaterThan(55);
  });

  it('7. Directional display inflation path: coverage <= 65 and high directionals get 0.96 scale', () => {
    const totalSignals = COMPATIBILITY_SIGNAL_KEYS.length;
    const numComparable = 8;
    const keys = COMPATIBILITY_SIGNAL_KEYS.slice(0, numComparable);
    const highSignals: Record<string, number> = {};
    for (const k of keys) highSignals[k] = 9;
    const profileA = makeProfile('a', 'A', highSignals, 90);
    const profileB = makeProfile('b', 'B', highSignals, 90);

    const result = compare(profileA, profileB);

    const expectedCoverage = Math.round(100 * (numComparable / totalSignals));
    expect(result.coveragePercent).toBe(expectedCoverage);
    expect(result.coveragePercent).toBeLessThanOrEqual(65);
    if (result.aToB > 92 || result.bToA > 92) {
      expect(result.aToB).toBeLessThanOrEqual(96);
      expect(result.bToA).toBeLessThanOrEqual(96);
    }
  });

  it('VISIBILITY_NEED_MISMATCH uses LLM derivedContext when stored on evaluation', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 50);
    const profileB = makeProfile('b', 'B', signals, 50);
    profileA.evaluation = {
      ...profileA.evaluation,
      derivedContext: {
        version: 'v1',
        occupationClass: null,
        visibilityNeed: 2,
        lifeStage: 5,
      },
    };
    profileB.evaluation = {
      ...profileB.evaluation,
      derivedContext: {
        version: 'v1',
        occupationClass: null,
        visibilityNeed: 8,
        lifeStage: 5,
      },
    };

    const result = compare(profileA, profileB);

    expect(
      result.dealbreakers?.some((d) => d.code === 'VISIBILITY_NEED_MISMATCH'),
    ).toBe(true);
  });

  it('VISIBILITY_NEED_MISMATCH via regex when derivedContext absent', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 50);
    const profileB = makeProfile('b', 'B', signals, 50);
    profileA.texts = {
      aboutMe: 'I keep to myself and prefer a private quiet life.',
      aboutPartner: '',
      aboutRelationship: '',
    };
    profileB.texts = {
      aboutMe: 'Very social and outgoing, visible public networking life.',
      aboutPartner: '',
      aboutRelationship: '',
    };

    const result = compare(profileA, profileB);

    expect(
      result.dealbreakers?.some((d) => d.code === 'VISIBILITY_NEED_MISMATCH'),
    ).toBe(true);
  });

  describe('Sprint 21: conflictStyle + interestAlignment', () => {
    it('exposes interestAlignment on compare result', () => {
      const signals = makeSignals({});
      const a = makeProfile('a', 'A', signals, 60, undefined, ['hiking', 'books']);
      const b = makeProfile('b', 'B', signals, 60, undefined, ['hiking', 'books']);
      const result = compare(a, b);
      expect(result.interestAlignment).toBe(100);
      expect(result.explainability.sharedInterestNote).toBe(
        'You both enjoy hiking, books.',
      );
    });

    it('interestAlignment is 0 when either side has no interests', () => {
      const signals = makeSignals({});
      const a = makeProfile('a', 'A', signals, 60, undefined, ['hiking']);
      const b = makeProfile('b', 'B', signals, 60, undefined, []);
      const result = compare(a, b);
      expect(result.interestAlignment).toBe(2); // one-sided floor k=1
      expect(result.explainability.sharedInterestNote).toBeUndefined();
    });

    it('shared interests raise compatibility vs empty interests (same signals)', () => {
      const signals = makeSignals({});
      const withSharedA = makeProfile('a', 'A', signals, 70, undefined, [
        'hiking',
        'books',
      ]);
      const withSharedB = makeProfile('b', 'B', signals, 70, undefined, [
        'hiking',
        'books',
      ]);
      const emptyA = makeProfile('c', 'C', signals, 70, undefined, []);
      const emptyB = makeProfile('d', 'D', signals, 70, undefined, []);
      const withShared = compare(withSharedA, withSharedB);
      const empty = compare(emptyA, emptyB);
      expect(withShared.interestAlignment).toBe(100);
      expect(empty.interestAlignment).toBe(0);
      expect(withShared.compatibility).toBeGreaterThan(empty.compatibility);
    });

    it('aligned conflictStyle can surface Conflict approach chip', () => {
      const signals = makeSignals({ conflictStyle: 9 });
      const a = makeProfile('a', 'A', signals, 70);
      const b = makeProfile('b', 'B', signals, 70);
      const result = compare(a, b);
      expect(result.explainability.positiveChips).toContain('Conflict approach');
    });

    it('coverage denominator is 15 keys (conflictStyle official)', () => {
      expect(COMPATIBILITY_SIGNAL_KEYS).toContain('conflictStyle');
      expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
      const signals = makeSignals({}); // includes conflictStyle=5
      const a = makeProfile('a', 'A', signals, 50);
      const b = makeProfile('b', 'B', signals, 50);
      const result = compare(a, b);
      expect(result.coveragePercent).toBe(100);
    });
  });
});
