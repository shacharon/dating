import {
  buildHardBlockReasons,
  isExistingHardBlockCandidate,
} from './hard-block-reasons';
import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';
import type {
  DealbreakerSignal,
  SelfFactHint,
} from './dealbreaker-signals-text.extract';

function dim(
  status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED' | 'SOFT_PASS',
  reasonCode: string,
) {
  return { status, reasonCode };
}

function emptyEval(
  overrides?: Partial<HolyGrailDirectionalEvaluationResult>,
): HolyGrailDirectionalEvaluationResult {
  return {
    dimensions: {
      GENDER: dim('PASS', 'GENDER_IN_ALLOWLIST'),
      AGE: dim('SKIPPED', 'AGE_PREF_ABSENT'),
      PROXIMITY: dim('SKIPPED', 'PROXIMITY_PREF_ABSENT'),
    },
    dealbreakerDimensions: {},
    overallHardEligibility: 'PASS',
    eligibilityFlags: { children_unsure: false },
    ...overrides,
  };
}

function sig(
  tag: DealbreakerSignal['tag'],
  evidence: string,
): DealbreakerSignal {
  return {
    tag,
    classification: 'HARD_EXCLUDE',
    evidence,
    confidence: 0.95,
  };
}

describe('isExistingHardBlockCandidate', () => {
  it('LIKE alone → true', () => {
    expect(
      isExistingHardBlockCandidate({
        yourAction: 'LIKE',
        hasActiveMutual: false,
      }),
    ).toBe(true);
  });

  it('active mutual alone → true', () => {
    expect(
      isExistingHardBlockCandidate({
        yourAction: null,
        hasActiveMutual: true,
      }),
    ).toBe(true);
  });

  it('PASS only → false', () => {
    expect(
      isExistingHardBlockCandidate({
        yourAction: 'PASS',
        hasActiveMutual: false,
      }),
    ).toBe(false);
  });

  it('null / no mutual → false', () => {
    expect(
      isExistingHardBlockCandidate({
        yourAction: null,
        hasActiveMutual: false,
      }),
    ).toBe(false);
  });

  it('BLOCK alone → false', () => {
    expect(
      isExistingHardBlockCandidate({
        yourAction: 'BLOCK',
        hasActiveMutual: false,
      }),
    ).toBe(false);
  });
});

describe('buildHardBlockReasons', () => {
  it('emits dealbreaker FAIL with both quotes (viewer_to_them)', () => {
    const aToB = emptyEval({
      overallHardEligibility: 'FAIL',
      dealbreakerDimensions: {
        smoking: dim('FAIL', 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT'),
      },
    });
    const reasons = buildHardBlockReasons({
      aToB,
      bToA: emptyEval(),
      viewerSignals: [sig('smoking', "I don't want smokers")],
      counterpartySelfHints: [
        {
          field: 'smokingFrequency',
          value: 'REGULAR',
          evidence: 'I smoke',
          confidence: 0.95,
        } satisfies SelfFactHint,
      ],
    });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatchObject({
      code: 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT',
      dimension: 'smoking',
      direction: 'viewer_to_them',
      evidence: {
        viewerQuote: "I don't want smokers",
        counterpartyQuote: 'I smoke',
      },
    });
    expect(reasons[0]!.message).toContain("I don't want smokers");
    expect(reasons[0]!.message).toContain('I smoke');
  });

  it('emits both directions and fixed AGE FAIL; omits missing quotes', () => {
    const aToB = emptyEval({
      overallHardEligibility: 'FAIL',
      dimensions: {
        GENDER: dim('PASS', 'GENDER_IN_ALLOWLIST'),
        AGE: dim('FAIL', 'AGE_BELOW_MIN'),
        PROXIMITY: dim('SKIPPED', 'PROXIMITY_PREF_ABSENT'),
      },
      dealbreakerDimensions: {
        smoking: dim('FAIL', 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT'),
      },
    });
    const bToA = emptyEval({
      overallHardEligibility: 'FAIL',
      dealbreakerDimensions: {
        smoking: dim('FAIL', 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT'),
      },
    });
    const reasons = buildHardBlockReasons({
      aToB,
      bToA,
      viewerSignals: [sig('smoking', 'No smokers')],
      counterpartySignals: [sig('smoking', 'Non-smokers only')],
      viewerSelfHints: [
        {
          field: 'smokingFrequency',
          value: 'REGULAR',
          evidence: 'I am a smoker',
          confidence: 0.9,
        },
      ],
      // column-only / no hint → no counterpartyQuote on viewer_to_them smoking
      counterpartySelfHints: [],
    });

    expect(reasons.map((r) => `${r.direction}:${r.dimension}`).sort()).toEqual(
      [
        'them_to_viewer:smoking',
        'viewer_to_them:AGE',
        'viewer_to_them:smoking',
      ].sort(),
    );

    const age = reasons.find((r) => r.dimension === 'AGE');
    expect(age?.evidence).toBeUndefined();
    expect(age?.message).toContain('age');

    const aSmoking = reasons.find(
      (r) => r.direction === 'viewer_to_them' && r.dimension === 'smoking',
    );
    expect(aSmoking?.evidence).toEqual({ viewerQuote: 'No smokers' });
    expect(aSmoking?.evidence?.counterpartyQuote).toBeUndefined();

    const bSmoking = reasons.find(
      (r) => r.direction === 'them_to_viewer' && r.dimension === 'smoking',
    );
    expect(bSmoking?.evidence).toEqual({
      viewerQuote: 'I am a smoker',
      counterpartyQuote: 'Non-smokers only',
    });
  });

  it('deduplicates by direction+dimension+code', () => {
    const fail = emptyEval({
      overallHardEligibility: 'FAIL',
      dealbreakerDimensions: {
        smoking: dim('FAIL', 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT'),
      },
    });
    const reasons = buildHardBlockReasons({
      aToB: fail,
      bToA: emptyEval(),
      viewerSignals: [sig('smoking', 'x'), sig('smoking', 'y')],
      counterpartySelfHints: [],
    });
    expect(reasons).toHaveLength(1);
  });
});
