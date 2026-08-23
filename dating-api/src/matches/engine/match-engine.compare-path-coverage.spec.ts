import { compare, compareWithStatus } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { INTEREST_CANONICAL_TAGS } from '../../extraction/extracted-interests.interface';
import { makeProfile, makeSignals } from './match-engine.spec-support';

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

