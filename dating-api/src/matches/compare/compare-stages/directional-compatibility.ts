import {
  COMPATIBILITY_SIGNAL_KEYS,
  computeCompatibility,
} from '../../../compatibility/compatibility-score';
import type { CompatibilityResult } from '../../../compatibility/compatibility-score';
import { coveragePercent as coveragePercentFormula } from '../../../engine/coverage';
import { clampTo100 } from './util';

export interface DirectionalCompatibility {
  compatAB: CompatibilityResult;
  compatBA: CompatibilityResult;
  aToB: number;
  bToA: number;
  coveragePercentValue: number;
  presentA: number;
  presentB: number;
  minPresent: number;
  maxPresent: number;
}

export function computeDirectionalCompatibility(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): DirectionalCompatibility {
  const compatAB: CompatibilityResult = computeCompatibility(
    signalsA,
    signalsB,
  );
  const compatBA: CompatibilityResult = computeCompatibility(
    signalsB,
    signalsA,
  );
  const aToB = clampTo100(compatAB.overallScore);
  const bToA = clampTo100(compatBA.overallScore);
  const totalSignals = COMPATIBILITY_SIGNAL_KEYS.length;
  const numComparableSignals = compatAB.matchedSignals;
  const coveragePercentValue = coveragePercentFormula(
    numComparableSignals,
    totalSignals,
  );
  const countPresent = (s: Record<string, number | null>) =>
    COMPATIBILITY_SIGNAL_KEYS.filter(
      (k) => s[k] != null && Number.isFinite(Number(s[k])),
    ).length;
  const presentA = countPresent(signalsA);
  const presentB = countPresent(signalsB);
  const minPresent = Math.min(presentA, presentB);
  const maxPresent = Math.max(presentA, presentB);
  return {
    compatAB,
    compatBA,
    aToB,
    bToA,
    coveragePercentValue,
    presentA,
    presentB,
    minPresent,
    maxPresent,
  };
}
