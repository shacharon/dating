import type {
  BreakdownEntry,
  CompatibilityResult,
  HardMismatch,
} from '../../compatibility/compatibility-score';
import type { Dealbreaker } from '../../domain/dealbreakers';
import { resolveDerivedContext } from '../../domain/deriveContext';
import type { RelationshipBalanceResult } from '../../domain/relationshipBalance';
import type { CapsCalibrationState } from '../calibration-policy';
import type { CoverageConfidenceState, MatchInfoFlag } from '../coverage-policy';
import { applyDirectionalDisplayCalibration } from '../display-policy';
import type { FrictionAndPenaltiesState } from '../friction-policy';
import { buildExpansion01ShadowBreakdown } from '../expansion-01-explainability';
import { buildExpansion02ShadowBreakdown } from '../expansion-02-explainability';
import { buildExpansion03ShadowBreakdown } from '../expansion-03-explainability';
import { buildExpansion04ShadowBreakdown } from '../expansion-04-explainability';
import { buildExpansion05ShadowBreakdown } from '../expansion-05-explainability';
import { buildExpansion06ShadowBreakdown } from '../expansion-06-explainability';
import { buildExpansion07ShadowBreakdown } from '../expansion-07-explainability';
import { buildExpansion10ShadowBreakdown } from '../expansion-10-explainability';
import { buildExpansion11ShadowBreakdown } from '../expansion-11-explainability';
import { buildExpansion12ShadowBreakdown } from '../expansion-12-explainability';
import { buildMatchExplainability } from '../match-explainability';
import {
  ALIGNMENT_CHIP_MIN_PAIR_SCORE,
  BALANCE_RATIO_MID,
  EXPLAIN_CHIP_LIMIT,
  MATCH_DEBUG_LOG_LIMIT,
  RELATIONSHIP_FIT_GREEN_BOOST,
  VERY_LOW_COVERAGE_CONFIDENCE_CAP,
  VERY_LOW_COVERAGE_PERCENT,
} from '../matching-algorithm.constants';
import { buildMatchRecommendation } from '../match-recommendation';
import type { ProfileJsonPayload } from '../../profiles/profiles.types';
import type {
  CompareAlignmentDto,
  CompareResultDto,
  CompareTensionDto,
  MatchDebugDto,
  MatchDebugPenaltyDto,
  TensionMatrixEntryDto,
} from '../match-engine.types';
import { clampTo100, formatSignalKey } from './util';

/** MATCH_DEBUG=1: log debug object for first 50 matches only; default 0 = no per-match logs. */
let matchDebugLogCount = 0;

function shouldLogMatchDebug(): boolean {
  if (process.env.MATCH_DEBUG !== '1') return false;
  if (matchDebugLogCount >= MATCH_DEBUG_LOG_LIMIT) return false;
  matchDebugLogCount += 1;
  return true;
}

export function buildDebugDto(
  raw: number,
  coveragePercentValue: number,
  scoreCoverageFactorValue: number,
  coverageFactorValue: number,
  confidenceValue: number,
  infoFlags: MatchInfoFlag[],
  balance: RelationshipBalanceResult,
  dealbreakers: Dealbreaker[],
  tensionMatrix: TensionMatrixEntryDto[],
  appliedFrictionPenaltyScaled: number,
  preCapFinalScore: number,
  finalScoreValue: number,
  finalScoreClamped: number,
  provenance: string[],
): MatchDebugDto {
  const penalties: MatchDebugPenaltyDto[] = [
    { reason: 'friction', amount: appliedFrictionPenaltyScaled },
    ...tensionMatrix.map((t) => ({ reason: t.name, amount: t.penalty })),
  ];
  const dealbreakerCapAmount = preCapFinalScore - finalScoreValue;
  if (dealbreakerCapAmount > 0) {
    penalties.push({ reason: 'dealbreaker_cap', amount: dealbreakerCapAmount });
  }
  const bonuses: MatchDebugPenaltyDto[] = [];
  if (balance.ratio >= BALANCE_RATIO_MID) {
    bonuses.push({
      reason: 'GREEN_TIER_RELATIONSHIP_BOOST',
      amount: RELATIONSHIP_FIT_GREEN_BOOST,
    });
  }
  return {
    baseScore: raw,
    coveragePercent: coveragePercentValue,
    scoreCoverageFactor: scoreCoverageFactorValue,
    coverageFactor: coverageFactorValue,
    confidence: confidenceValue,
    infoFlags,
    balanceRatio: balance.ratio,
    dealbreakers,
    penalties,
    bonuses,
    finalScoreBeforeClamp: clampTo100(finalScoreValue),
    finalScore: finalScoreClamped,
    provenance,
  };
}

export function buildFinalResultDto(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
  ctxA: ReturnType<typeof resolveDerivedContext>,
  ctxB: ReturnType<typeof resolveDerivedContext>,
  dealbreakers: Dealbreaker[],
  balance: RelationshipBalanceResult,
  compatAB: CompatibilityResult,
  aToB: number,
  bToA: number,
  coveragePercentValue: number,
  relationshipFit: number,
  valuesAlignment: number,
  friction: number,
  frictionRisk: number,
  compatibilityValue: number,
  tensionMatrix: TensionMatrixEntryDto[],
  coverageConfidence: CoverageConfidenceState,
  frictionState: FrictionAndPenaltiesState,
  caps: CapsCalibrationState,
  interestAlignmentValue: number,
  sharedInterests: string[],
): CompareResultDto {
  const { infoFlags } = coverageConfidence;
  let { scoreCoverageFactorValue, coverageFactorValue, confidenceValue } =
    coverageConfidence;
  if (coveragePercentValue < VERY_LOW_COVERAGE_PERCENT) {
    confidenceValue = Math.min(
      confidenceValue,
      VERY_LOW_COVERAGE_CONFIDENCE_CAP,
    );
  }
  const {
    frictionPenaltyValue,
    frictionPenaltyScaled,
    frictionMultiplier,
    appliedFrictionPenaltyScaled,
    raw,
  } = frictionState;
  const { finalScoreClamped, preCapFinalScore, finalScoreValue } = caps;

  const provenance: string[] = [
    'compat_minus_friction_no_coverage_mult',
    'friction_adjustment',
    'dealbreaker_optional',
    'hard_cap_90',
  ];
  if (preCapFinalScore !== finalScoreValue) provenance.push('dealbreaker_cap');
  if (caps.sparseFinalCapApplied) provenance.push('sparse_final_cap');

  const debug = buildDebugDto(
    raw,
    coveragePercentValue,
    scoreCoverageFactorValue,
    coverageFactorValue,
    confidenceValue,
    infoFlags,
    balance,
    dealbreakers,
    tensionMatrix,
    appliedFrictionPenaltyScaled,
    preCapFinalScore,
    finalScoreValue,
    finalScoreClamped,
    provenance,
  );

  if (shouldLogMatchDebug()) {
    console.debug({
      compatibility: compatibilityValue,
      scoreCoverageFactor: scoreCoverageFactorValue,
      coverageFactor: coverageFactorValue,
      confidence: confidenceValue,
      infoFlags,
      frictionPenalty: frictionPenaltyValue,
      frictionPenaltyScaled,
      frictionMultiplier,
      appliedFrictionPenaltyScaled,
      rawScore: raw,
      finalScore: finalScoreClamped,
    });
  }

  const alignments: CompareAlignmentDto[] = (compatAB.breakdown ?? [])
    .filter((e: BreakdownEntry) => e.pairScore >= ALIGNMENT_CHIP_MIN_PAIR_SCORE)
    .sort((a: BreakdownEntry, b: BreakdownEntry) => b.pairScore - a.pairScore)
    .slice(0, EXPLAIN_CHIP_LIMIT)
    .map((e: BreakdownEntry) => ({
      key: formatSignalKey(e.key),
      pairScore: e.pairScore,
    }));

  const tensions: CompareTensionDto[] = (compatAB.hardMismatches ?? [])
    .slice(0, EXPLAIN_CHIP_LIMIT)
    .map((h: HardMismatch) => ({
      key: formatSignalKey(h.key),
      gap: h.gap,
      text: h.reason ?? `Gap ${h.gap}`,
    }));

  const { displayAToB, displayBToA } = applyDirectionalDisplayCalibration(
    aToB,
    bToA,
    coveragePercentValue,
  );

  const signalsA = profileA.evaluation?.self?.signals ?? {};
  const signalsB = profileB.evaluation?.self?.signals ?? {};
  const shadowBreakdown = [
    ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion03ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion04ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion05ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion06ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion07ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion10ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion11ShadowBreakdown(signalsA, signalsB),
    ...buildExpansion12ShadowBreakdown(signalsA, signalsB),
  ];
  const breakdownForChips = [
    ...(compatAB.breakdown ?? []),
    ...shadowBreakdown,
  ];

  const explainability = buildMatchExplainability({
    compatibility: compatibilityValue,
    finalScore: finalScoreClamped,
    friction,
    breakdown: breakdownForChips,
    tensionMatrix,
    sharedInterests,
  });

  const recommendation = buildMatchRecommendation({
    finalScore: finalScoreClamped,
    friction,
    explainability,
    dealbreakers: dealbreakers.map((d) => d.code),
  });

  return {
    aToB: displayAToB,
    bToA: displayBToA,
    relationshipStyle: relationshipFit,
    coverage: coveragePercentValue,
    frictionRisk,
    compatibility: compatibilityValue,
    valuesAlignment,
    interestAlignment: interestAlignmentValue,
    finalScore: finalScoreClamped,
    rawScore: raw,
    friction,
    frictionPenalty: frictionPenaltyValue,
    coveragePercent: coveragePercentValue,
    scoreCoverageFactor: scoreCoverageFactorValue,
    confidence: confidenceValue,
    infoFlags,
    coverageFactor: coverageFactorValue,
    alignments,
    tensions,
    tensionMatrix,
    derived: {
      a: {
        occupationClass: ctxA.occupationClass,
        visibilityNeed: ctxA.visibilityNeed,
        lifeStage: ctxA.lifeStage,
      },
      b: {
        occupationClass: ctxB.occupationClass,
        visibilityNeed: ctxB.visibilityNeed,
        lifeStage: ctxB.lifeStage,
      },
    },
    dealbreakers,
    balance,
    debug,
    explainability,
    recommendation,
  };
}
