import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';
import type { ProfileJsonPayload } from '../profiles/profiles.types';

export type HolyGrailPairDirections = {
  readonly aToB: HolyGrailDirectionalEvaluationResult;
  readonly bToA: HolyGrailDirectionalEvaluationResult;
};

/** Both directions pass Layer-3 hard eligibility (no dimension `FAIL`). */
export function directionsMutualHardPass(d: HolyGrailPairDirections): boolean {
  return (
    d.aToB.overallHardEligibility === 'PASS' &&
    d.bToA.overallHardEligibility === 'PASS'
  );
}

/**
 * Deep-clone profile and fill missing / non-finite compatibility self-signals with neutral `5`
 * so `compareWithStatus` can run as **secondary** scoring after HG-first admission.
 */
export function profileWithNeutralSelfSignalsFallback(
  p: ProfileJsonPayload,
): ProfileJsonPayload {
  if (!p.evaluation?.self) return p;
  const c = JSON.parse(JSON.stringify(p)) as ProfileJsonPayload;
  if (!c.evaluation?.self) return p;
  const signals = { ...(c.evaluation.self.signals ?? {}) } as Record<
    string,
    number | null
  >;
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    const cur = signals[k];
    if (cur == null || !Number.isFinite(Number(cur))) {
      signals[k] = 5;
    }
  }
  c.evaluation.self.signals = signals;
  return c;
}
