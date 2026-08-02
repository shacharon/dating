import { computeFriction } from '../../engine/compute-friction';
import type { EnrichedSignals } from '../../engine/tension-rules';
import type { RelationshipBalanceResult } from '../../domain/relationshipBalance';
import type { TensionMatrixEntryDto } from '../match-engine.types';
import {
  ASYMMETRY_MAX_PRESENT,
  ASYMMETRY_MIN_PRESENT,
  ASYMMETRY_SCALE,
  BALANCE_RATIO_LOW,
  BALANCE_RATIO_MID,
  FRICTION_MIN_WHEN_BALANCE_LOW,
  FRICTION_MIN_WHEN_BALANCE_MID,
  FRICTION_RISK_SCALE,
  HARD_SCORE_CAP_90,
  LOW_EVIDENCE_COVERAGE_PERCENT,
  LOW_EVIDENCE_FRICTION_FLOOR,
  LOW_EVIDENCE_MIN_PRESENT,
} from '../matching-algorithm.constants';
import { clampTo100 } from './util';

export interface CoverageAsymmetryLowEvidence {
  aToBForCompat: number;
  bToAForCompat: number;
  friction: number;
  frictionRisk: number;
  baseFriction: number;
  tensionMatrix: TensionMatrixEntryDto[];
}

export function computeCoverageAsymmetryLowEvidenceAdjustments(
  enrichedA: EnrichedSignals,
  enrichedB: EnrichedSignals,
  balance: RelationshipBalanceResult,
  coveragePercentValue: number,
  presentA: number,
  presentB: number,
  minPresent: number,
  maxPresent: number,
  aToB: number,
  bToA: number,
): CoverageAsymmetryLowEvidence {
  const { friction: baseFriction, tensions: tensionMatrix } = computeFriction(
    enrichedA,
    enrichedB,
  );
  const frictionMinimum =
    balance.ratio < BALANCE_RATIO_LOW && baseFriction > 0
      ? FRICTION_MIN_WHEN_BALANCE_LOW
      : balance.ratio >= BALANCE_RATIO_LOW &&
          balance.ratio < BALANCE_RATIO_MID
        ? FRICTION_MIN_WHEN_BALANCE_MID
        : 0;
  const isAsymmetric =
    minPresent <= ASYMMETRY_MIN_PRESENT && maxPresent >= ASYMMETRY_MAX_PRESENT;
  const asymmetryScale = isAsymmetric ? ASYMMETRY_SCALE : 1;
  let aToBForCompat = clampTo100(Math.round(aToB * asymmetryScale));
  let bToAForCompat = clampTo100(Math.round(bToA * asymmetryScale));
  aToBForCompat = Math.min(aToBForCompat, HARD_SCORE_CAP_90);
  bToAForCompat = Math.min(bToAForCompat, HARD_SCORE_CAP_90);
  let friction = Math.max(baseFriction, frictionMinimum);
  const lowEvidence =
    coveragePercentValue <= LOW_EVIDENCE_COVERAGE_PERCENT ||
    isAsymmetric ||
    minPresent <= LOW_EVIDENCE_MIN_PRESENT;
  if (lowEvidence) {
    friction = Math.max(friction, LOW_EVIDENCE_FRICTION_FLOOR);
  }
  const frictionRisk = Math.min(
    100,
    Math.round(friction * FRICTION_RISK_SCALE),
  );
  return {
    aToBForCompat,
    bToAForCompat,
    friction,
    frictionRisk,
    baseFriction,
    tensionMatrix,
  };
}
