import { compare, compareWithStatus, hasAnalyzedSignals } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import * as compatibilityScore from '../../compatibility/compatibility-score';
import { MAX_POSITIVE_CHIPS } from '../explainability/core/match-explainability';
import { makeProfile, makeSignals } from './match-engine.spec-support';

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
    expect(result.explainability.positiveChips.length).toBeLessThanOrEqual(
      MAX_POSITIVE_CHIPS,
    );
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
