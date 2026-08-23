import type { ChildrenUnsureProfileRow } from '../matches/children-unsure/children-unsure-profile-row.types';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import * as holyGrailPair from '../matches/holy-grail/holy-grail-pair-directions';
import * as matchEngine from '../matches/engine/match-engine';
import { MATCH_RANKING_CONTRACT } from '../matches/recommendation/match-ranking-contract';
import { HgGateLegacyRankPolicy } from './hg-gate-legacy-rank.policy';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';

describe('HgGateLegacyRankPolicy', () => {
  const policy = new HgGateLegacyRankPolicy();

  const viewerHgRow = { id: 'v' } as unknown as ChildrenUnsureProfileRow;
  const candidateHgRow = { id: 'c' } as unknown as ChildrenUnsureProfileRow;
  const viewerEnginePayload = { id: 'v' } as unknown as ProfileJsonPayload;
  const candidateEnginePayload = { id: 'c' } as unknown as ProfileJsonPayload;

  const input = {
    viewerHgRow,
    candidateHgRow,
    viewerEnginePayload,
    candidateEnginePayload,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function direction(
    overallHardEligibility: 'PASS' | 'FAIL' | 'UNKNOWN',
  ): HolyGrailDirectionalEvaluationResult {
    return { overallHardEligibility } as HolyGrailDirectionalEvaluationResult;
  }

  it('marks hard FAIL when either direction is FAIL', () => {
    jest.spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections').mockReturnValue({
      aToB: direction('FAIL'),
      bToA: direction('PASS'),
    });
    jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
      status: 'NOT_ANALYZED',
      message: 'guard',
      finalScore: null,
    } as never);

    const result = policy.evaluate(input);

    expect(result.contractId).toBe(MATCH_RANKING_CONTRACT);
    expect(result.gate.isHardFail).toBe(true);
    expect(result.gate.hgDirections).not.toBeNull();
  });

  it('is lenient when evaluateHolyGrailPairDirections returns null', () => {
    jest
      .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
      .mockReturnValue(null);
    jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
      status: 'NOT_ANALYZED',
      message: 'guard',
      finalScore: null,
    } as never);

    const result = policy.evaluate(input);

    expect(result.gate.hgDirections).toBeNull();
    expect(result.gate.isHardFail).toBe(false);
  });

  it('returns score happy path from compareWithStatus', () => {
    jest.spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections').mockReturnValue({
      aToB: direction('PASS'),
      bToA: direction('PASS'),
    });
    const explainability = { positiveChips: [] } as never;
    const recommendation = { tier: 'good' } as never;
    jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
      finalScore: 72,
      explainability,
      recommendation,
    } as never);

    const result = policy.evaluate(input);

    expect(result.gate.isHardFail).toBe(false);
    expect(result.score).toEqual({
      matchScore: 72,
      explainability,
      recommendation,
      scoreGuarded: false,
    });
  });

  it('returns null score when compareWithStatus is guarded', () => {
    jest.spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections').mockReturnValue({
      aToB: direction('PASS'),
      bToA: direction('PASS'),
    });
    jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
      status: 'INSUFFICIENT_DATA',
      message: 'no signals',
      finalScore: null,
    } as never);

    const result = policy.evaluate(input);

    expect(result.score).toEqual({
      matchScore: null,
      explainability: null,
      recommendation: null,
      scoreGuarded: true,
    });
  });
});
