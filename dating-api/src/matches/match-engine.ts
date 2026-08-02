/**
 * Deterministic match comparison from two profile payloads.
 * No framework deps; used by MatchesService.
 * Legacy dealbreakers vs HG children: `../domain/kids-family-ownership.ts`.
 *
 * Sprint 40 Story 1 — scoring stages live under `./compare-stages/`; this file is the facade.
 */

import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { applyDealbreakerCap } from '../domain/dealbreakers';
import {
  applySparseFinalScoreCap,
  computeConfidenceAndInfoFlags,
  shouldApplySparseFinalScoreCap,
} from './coverage-policy';
import {
  computeFrictionAndFrictionPenalties,
  type FrictionAndPenaltiesState,
} from './friction-policy';
import type { CapsCalibrationState } from './calibration-policy';
import {
  computeInterestAlignment,
  sharedInterestTags,
} from './interest-alignment';
import {
  EDGE_BOOST_COMPAT_MAX,
  EDGE_BOOST_COMPAT_MIN,
  EDGE_BOOST_MAX_FRICTION,
  EDGE_BOOST_RAW_DELTA,
  HARD_SCORE_CAP_90,
} from './matching-algorithm.constants';
import { buildFinalResultDto } from './compare-stages/assemble-result';
import { computeCompatibilityAndNuancePenalties } from './compare-stages/compatibility-nuance';
import { computeCoverageAsymmetryLowEvidenceAdjustments } from './compare-stages/coverage-asymmetry-friction';
import { computeDealbreakersAndBalance } from './compare-stages/dealbreakers-balance';
import { deriveProfileContextsAndEnrichedSignals } from './compare-stages/derive-contexts';
import { computeDirectionalCompatibility } from './compare-stages/directional-compatibility';
import { computeRelationshipFitAndValuesAlignment } from './compare-stages/relationship-fit-values';
import { clampTo100 } from './compare-stages/util';
import type {
  CompareGuardFailureResultDto,
  CompareResultDto,
} from './match-engine.types';

export type {
  MatchInfoFlag,
  MatchExplainabilityDto,
  MatchRecommendationDto,
  MatchDebugPenaltyDto,
  MatchDebugDto,
  CompareAlignmentDto,
  CompareTensionDto,
  TensionMatrixEntryDto,
  CompareResultDto,
  CompareNotAnalyzedResultDto,
  CompareInsufficientDataResultDto,
  CompareGuardFailureResultDto,
} from './match-engine.types';

export function isEvaluationPending(profile: ProfileJsonPayload): boolean {
  const s = profile.evaluationStatus;
  return s != null && s !== 'DONE';
}

export function hasNumericSelfSignals(profile: ProfileJsonPayload): boolean {
  const signals = profile.evaluation?.self?.signals;
  if (!signals || typeof signals !== 'object') return false;
  return Object.values(signals).some(
    (v) => typeof v === 'number' && Number.isFinite(v),
  );
}

export function hasAnalyzedSignals(profile: ProfileJsonPayload): boolean {
  if (isEvaluationPending(profile)) return false;
  return hasNumericSelfSignals(profile);
}

const GUARD_NULL_FIELDS = {
  compatibility: null,
  partnerFit: null,
  relationshipFit: null,
  coverage: null,
  friction: null,
  finalScore: null,
} as const;

export function compareWithStatus(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
): CompareResultDto | CompareGuardFailureResultDto {
  if (isEvaluationPending(profileA) || isEvaluationPending(profileB)) {
    return {
      status: 'NOT_ANALYZED',
      message: 'Run analyze for both profiles before compare',
      ...GUARD_NULL_FIELDS,
    };
  }
  if (!hasNumericSelfSignals(profileA) || !hasNumericSelfSignals(profileB)) {
    return {
      status: 'INSUFFICIENT_DATA',
      message:
        'Profile self signals are empty or non-numeric; cannot score match',
      ...GUARD_NULL_FIELDS,
    };
  }
  return compare(profileA, profileB);
}

export function compare(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
): CompareResultDto {
  const step1 = deriveProfileContextsAndEnrichedSignals(profileA, profileB);
  const step2 = computeDealbreakersAndBalance(
    step1.signalsA,
    step1.ctxA,
    step1.signalsB,
    step1.ctxB,
  );
  const step3 = computeDirectionalCompatibility(step1.signalsA, step1.signalsB);
  const step4 = computeCoverageAsymmetryLowEvidenceAdjustments(
    step1.enrichedA,
    step1.enrichedB,
    step2.balance,
    step3.coveragePercentValue,
    step3.presentA,
    step3.presentB,
    step3.minPresent,
    step3.maxPresent,
    step3.aToB,
    step3.bToA,
  );
  const step6 = computeRelationshipFitAndValuesAlignment(
    profileA,
    profileB,
    step2.balance,
  );
  const interestsA =
    profileA.evaluation?.enrichment?.signals?.interestsTop3 ?? [];
  const interestsB =
    profileB.evaluation?.enrichment?.signals?.interestsTop3 ?? [];
  const interestAlignmentValue = computeInterestAlignment(interestsA, interestsB);
  const shared = sharedInterestTags(interestsA, interestsB);

  const step7Compat = computeCompatibilityAndNuancePenalties(
    step4.aToBForCompat,
    step4.bToAForCompat,
    step6.relationshipFit,
    step6.valuesAlignmentForCompat,
    step3.coveragePercentValue,
    step1.signalsA,
    step1.signalsB,
    interestAlignmentValue,
  );
  const step8 = computeConfidenceAndInfoFlags(step3.coveragePercentValue);
  const step5 = computeFrictionAndFrictionPenalties(
    step7Compat,
    step8.scoreCoverageFactorValue,
    step4.friction,
  );
  let rawScoreForPipeline = step5.raw;
  if (
    step4.friction <= EDGE_BOOST_MAX_FRICTION &&
    step7Compat >= EDGE_BOOST_COMPAT_MIN &&
    step7Compat <= EDGE_BOOST_COMPAT_MAX
  ) {
    rawScoreForPipeline += EDGE_BOOST_RAW_DELTA;
  }
  const preCapFinalScore = clampTo100(rawScoreForPipeline);
  const finalScoreAfterDealbreakers = applyDealbreakerCap(
    preCapFinalScore,
    step2.dealbreakers,
  );
  let finalScoreClamped = Math.min(
    HARD_SCORE_CAP_90,
    clampTo100(finalScoreAfterDealbreakers),
  );
  finalScoreClamped = applySparseFinalScoreCap(
    finalScoreClamped,
    step3.coveragePercentValue,
    step3.minPresent,
  );

  const step5ForDto: FrictionAndPenaltiesState = {
    ...step5,
    raw: rawScoreForPipeline,
  };
  const step9ForDto: CapsCalibrationState = {
    finalScoreValue: finalScoreAfterDealbreakers,
    finalScoreBeforeSparseCalibration: undefined,
    finalScoreClamped,
    preCapFinalScore,
    sparseFinalCapApplied: shouldApplySparseFinalScoreCap(
      step3.coveragePercentValue,
      step3.minPresent,
    ),
  };
  return buildFinalResultDto(
    profileA,
    profileB,
    step1.ctxA,
    step1.ctxB,
    step2.dealbreakers,
    step2.balance,
    step3.compatAB,
    step3.aToB,
    step3.bToA,
    step3.coveragePercentValue,
    step6.relationshipFit,
    step6.valuesAlignment,
    step4.friction,
    step4.frictionRisk,
    step7Compat,
    step4.tensionMatrix,
    step8,
    step5ForDto,
    step9ForDto,
    interestAlignmentValue,
    shared,
  );
}
