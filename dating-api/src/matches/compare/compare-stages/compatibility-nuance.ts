import { compatibility as compatibilityFormula } from '../../../engine/scoring';
import {
  COVERAGE_COMPAT_CEILING_BASE,
  LOW_EVIDENCE_COVERAGE_PERCENT,
  NUANCE_GAP_MAX,
  NUANCE_GAP_MIN,
  NUANCE_PENALTY,
} from '../../engine/matching-algorithm.constants';
import { clampTo100 } from './util';

export function computeCompatibilityAndNuancePenalties(
  aToBForCompat: number,
  bToAForCompat: number,
  relationshipFit: number,
  valuesAlignmentForCompat: number,
  coveragePercentValue: number,
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
  interestAlignmentValue: number,
): number {
  const compatibilityValueRaw = clampTo100(
    compatibilityFormula(
      aToBForCompat,
      bToAForCompat,
      relationshipFit,
      valuesAlignmentForCompat,
      interestAlignmentValue,
    ),
  );
  let compatibilityValue = compatibilityValueRaw;
  if (coveragePercentValue <= LOW_EVIDENCE_COVERAGE_PERCENT) {
    const coverageCeiling = COVERAGE_COMPAT_CEILING_BASE + coveragePercentValue;
    compatibilityValue = Math.min(compatibilityValue, coverageCeiling);
  }
  const getSignalGap = (key: string): number | null => {
    const a = signalsA[key];
    const b = signalsB[key];
    if (a == null || b == null) return null;
    const an = Number(a);
    const bn = Number(b);
    if (!Number.isFinite(an) || !Number.isFinite(bn)) return null;
    return Math.abs(an - bn);
  };
  const clarityGap = getSignalGap('relationshipClarity');
  const paceGap = getSignalGap('lifestylePace');
  let nuancePenalty = 0;
  if (
    clarityGap != null &&
    clarityGap >= NUANCE_GAP_MIN &&
    clarityGap <= NUANCE_GAP_MAX
  ) {
    nuancePenalty = NUANCE_PENALTY;
  } else if (
    paceGap != null &&
    paceGap >= NUANCE_GAP_MIN &&
    paceGap <= NUANCE_GAP_MAX
  ) {
    nuancePenalty = NUANCE_PENALTY;
  }
  compatibilityValue = Math.max(0, compatibilityValue - nuancePenalty);
  return compatibilityValue;
}
