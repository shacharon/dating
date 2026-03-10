import type { ProfileJsonPayload } from '../profiles/profiles-json.service';
import { compare, compareWithStatus, hasAnalyzedSignals } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS, TIER1_KEYS } from '../compatibility/compatibility-score';
import type { SignalKey } from '../compatibility/compatibility-score';
import * as compatibilityScore from '../compatibility/compatibility-score';

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
): ProfileJsonPayload {
  return {
    id,
    name,
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
    },
    savedAt: new Date().toISOString(),
  };
}

describe('match-engine compare', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('detects profile as not analyzed when self signals are empty', () => {
    const p = makeProfile('a', 'A', {} as Record<string, number>);
    expect(hasAnalyzedSignals(p)).toBe(false);
  });

  it('returns NOT_ANALYZED when either profile has no analyzed signals', () => {
    const analyzed = makeProfile('a', 'A', makeSignals({}));
    const empty = makeProfile('b', 'B', {} as Record<string, number>);

    const result = compareWithStatus(analyzed, empty);
    expect('status' in result ? result.status : 'READY').toBe('NOT_ANALYZED');
    if ('status' in result && result.status === 'NOT_ANALYZED') {
      expect(result.message).toBe('Run analyze for both profiles before compare');
      expect(result.compatibility).toBeNull();
      expect(result.partnerFit).toBeNull();
      expect(result.relationshipFit).toBeNull();
      expect(result.coverage).toBeNull();
      expect(result.friction).toBeNull();
      expect(result.overall).toBeNull();
      expect(result.compatibility).not.toBe(100);
    }
  });

  it('returns score + confidence fields separately', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 60);
    const profileB = makeProfile('b', 'B', signals, 40);

    const result = compare(profileA, profileB);

    expect(result).toHaveProperty('compatibility');
    expect(result).toHaveProperty('finalScore');
    expect(result).toHaveProperty('friction');
    expect(result).toHaveProperty('coveragePercent');
    expect(result).toHaveProperty('scoreCoverageFactor');
    expect(result).toHaveProperty('coverageFactor');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('infoFlags');
    expect(typeof result.compatibility).toBe('number');
    expect(typeof result.finalScore).toBe('number');
    expect(typeof result.friction).toBe('number');
    expect(typeof result.coveragePercent).toBe('number');
    expect(typeof result.scoreCoverageFactor).toBe('number');
    expect(typeof result.coverageFactor).toBe('number');
    expect(typeof result.confidence).toBe('number');
    expect(result.compatibility).toBeGreaterThanOrEqual(0);
    expect(result.compatibility).toBeLessThanOrEqual(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
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

  it('overallScore equals finalScore (backward compat)', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals);
    const profileB = makeProfile('b', 'B', signals);

    const result = compare(profileA, profileB);

    expect(result.overallScore).toBe(result.finalScore);
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
    expect(result.compatibility).toBeLessThan(20);
  });

  it('coveragePercent = round(100 * comparableSignals / totalSignals)', () => {
    const fullSignals = makeSignals({});
    const profileA = makeProfile('a', 'A', fullSignals);
    const profileB = makeProfile('b', 'B', fullSignals);

    const result = compare(profileA, profileB);

    const totalSignals = COMPATIBILITY_SIGNAL_KEYS.length;
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
    const tier1Signals: Record<string, number> = {};
    for (const k of TIER1_KEYS) tier1Signals[k] = 5;
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
  it('1. NOT_ANALYZED guard: exact shape when either profile has no analyzed signals', () => {
    const analyzed = makeProfile('a', 'A', makeSignals({}));
    const empty = makeProfile('b', 'B', {} as Record<string, number>);

    const result = compareWithStatus(analyzed, empty);

    expect(result).toHaveProperty('status', 'NOT_ANALYZED');
    const notAnalyzed = result as import('./match-engine').CompareNotAnalyzedResultDto;
    expect(notAnalyzed.message).toBe('Run analyze for both profiles before compare');
    expect(notAnalyzed.compatibility).toBeNull();
    expect(notAnalyzed.partnerFit).toBeNull();
    expect(notAnalyzed.relationshipFit).toBeNull();
    expect(notAnalyzed.coverage).toBeNull();
    expect(notAnalyzed.friction).toBeNull();
    expect(notAnalyzed.overall).toBeNull();
  });

  it('2. Normal analyzed pair: full coverage, deterministic key fields', () => {
    const signals = makeSignals({});
    const profileA = makeProfile('a', 'A', signals, 50);
    const profileB = makeProfile('b', 'B', signals, 50);

    const result = compare(profileA, profileB);

    expect(result.overallScore).toBe(result.finalScore);
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
    expect(result.finalScore).toBeLessThanOrEqual(100);
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
    expect(result.finalScoreBeforeSparseCalibration).toBeDefined();
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

  it('6. Sparse calibration path: coverage <= 55 sets finalScoreBeforeSparseCalibration and applies multiplier', () => {
    const totalSignals = COMPATIBILITY_SIGNAL_KEYS.length;
    const numComparable = 7;
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
    expect(result.finalScoreBeforeSparseCalibration).toBeDefined();
    expect(result.finalScore).toBeLessThanOrEqual(
      result.finalScoreBeforeSparseCalibration! + 1,
    );
    const sparseMultiplier =
      result.coveragePercent <= 50
        ? 0.92 + (result.coveragePercent / 50) * 0.08
        : 0.94 + ((result.coveragePercent - 50) / 5) * 0.06;
    expect(result.finalScore).toBe(
      Math.max(
        0,
        Math.min(
          100,
          Math.round(result.finalScoreBeforeSparseCalibration! * Math.min(1, sparseMultiplier)),
        ),
      ),
    );
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
});
