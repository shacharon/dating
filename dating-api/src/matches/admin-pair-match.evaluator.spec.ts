import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { HgGateLegacyRankPolicy } from '../matching-policy/hg-gate-legacy-rank.policy';
import * as holyGrailPair from './holy-grail-pair-directions';
import * as matchEngine from './match-engine';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';
import { AdminPairMatchEvaluator } from './admin-pair-match.evaluator';

describe('AdminPairMatchEvaluator', () => {
  const evaluator = new AdminPairMatchEvaluator(new HgGateLegacyRankPolicy());

  const rowA = { id: 'a' } as unknown as ChildrenUnsureProfileRow;
  const rowB = { id: 'b' } as unknown as ChildrenUnsureProfileRow;
  const profileA = { id: 'a' } as unknown as ProfileJsonPayload;
  const profileB = { id: 'b' } as unknown as ProfileJsonPayload;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function direction(
    overallHardEligibility: 'PASS' | 'FAIL' | 'UNKNOWN',
  ): HolyGrailDirectionalEvaluationResult {
    return { overallHardEligibility } as HolyGrailDirectionalEvaluationResult;
  }

  it('routes gate+score through PairMatchPolicy and returns READY compare DTO', () => {
    const hgSpy = jest
      .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
      .mockReturnValue({
        aToB: direction('PASS'),
        bToA: direction('PASS'),
      });
    const compareSpy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
      finalScore: 81,
      aToB: { score: 80 },
      bToA: { score: 82 },
      debug: { provenance: [] },
    } as never);

    const out = evaluator.evaluateCompare({
      rowA,
      rowB,
      profileA,
      profileB,
    });

    expect(hgSpy).toHaveBeenCalled();
    // Policy evaluate + DTO recovery (and no HG-first retry on READY).
    expect(compareSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect('status' in out.result).toBe(false);
    if (!('status' in out.result)) {
      expect(out.result.finalScore).toBe(81);
    }
    expect(out.hgDirections).not.toBeNull();
  });

  it('applies HG-first neutral retry when INSUFFICIENT_DATA and mutual hard PASS', () => {
    jest.spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections').mockReturnValue({
      aToB: direction('PASS'),
      bToA: direction('PASS'),
    });

    const guard = {
      status: 'INSUFFICIENT_DATA' as const,
      message: 'empty',
      finalScore: null,
    };
    const ready = {
      finalScore: 60,
      debug: { provenance: [] as string[] },
    };

    jest
      .spyOn(matchEngine, 'compareWithStatus')
      .mockReturnValueOnce(guard as never) // inside policy
      .mockReturnValueOnce(guard as never) // DTO recovery
      .mockReturnValueOnce(ready as never); // HG-first retry

    const out = evaluator.evaluateCompare({
      rowA,
      rowB,
      profileA,
      profileB,
    });

    expect('status' in out.result).toBe(false);
    if (!('status' in out.result)) {
      expect(out.result.finalScore).toBe(60);
      expect(out.result.debug?.provenance).toContain(
        'HG_FIRST_NEUTRAL_SIGNAL_LEGACY_FALLBACK',
      );
    }
  });

  it('does not retry when HG directions are null', () => {
    jest
      .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
      .mockReturnValue(null);
    const guard = {
      status: 'INSUFFICIENT_DATA' as const,
      message: 'empty',
      finalScore: null,
    };
    const compareSpy = jest
      .spyOn(matchEngine, 'compareWithStatus')
      .mockReturnValue(guard as never);

    const out = evaluator.evaluateCompare({
      rowA,
      rowB,
      profileA,
      profileB,
    });

    expect(out.result).toMatchObject(guard);
    // policy + DTO recovery only — no neutral retry
    expect(compareSpy).toHaveBeenCalledTimes(2);
  });
});
