/**
 * Deterministic match comparison from two profile payloads.
 * No framework deps; used by MatchesService.
 * Legacy dealbreakers vs HG children: `../domain/kids-family-ownership.ts`.
 */

import {
  COMPATIBILITY_SIGNAL_KEYS,
  computeValuesAlignment,
} from '../compatibility/compatibility-score';
import { computeCompatibility } from '../compatibility/compatibility-score';
import type {
  BreakdownEntry,
  CompatibilityResult,
  HardMismatch,
} from '../compatibility/compatibility-score';
import { coveragePercent as coveragePercentFormula } from '../engine/coverage';
import {
  applyKeywordTriggers,
  computeFriction,
} from '../engine/compute-friction';
import type { EnrichedSignals } from '../engine/tension-rules';
import { compatibility as compatibilityFormula } from '../engine/scoring';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { resolveDerivedContext } from '../domain/deriveContext';
import {
  applyDealbreakerCap,
  computeDealbreakers,
  type CoreSignals,
  type Dealbreaker,
} from '../domain/dealbreakers';
import {
  computeRelationshipBalance,
  type RelationshipBalanceResult,
} from '../domain/relationshipBalance';
import {
  applySparseFinalScoreCap,
  computeConfidenceAndInfoFlags,
  shouldApplySparseFinalScoreCap,
  type CoverageConfidenceState,
  type MatchInfoFlag,
} from './coverage-policy';
import {
  computeFrictionAndFrictionPenalties,
  type FrictionAndPenaltiesState,
} from './friction-policy';
import type { CapsCalibrationState } from './calibration-policy';
import { applyDirectionalDisplayCalibration } from './display-policy';
import {
  buildMatchExplainability,
  type MatchExplainabilityDto,
} from './match-explainability';
import {
  computeInterestAlignment,
  sharedInterestTags,
} from './interest-alignment';
import {
  buildMatchRecommendation,
  type MatchRecommendationDto,
} from './match-recommendation';
import {
  ALIGNMENT_CHIP_MIN_PAIR_SCORE,
  ASYMMETRY_MAX_PRESENT,
  ASYMMETRY_MIN_PRESENT,
  ASYMMETRY_SCALE,
  BALANCE_RATIO_LOW,
  BALANCE_RATIO_MID,
  COVERAGE_COMPAT_CEILING_BASE,
  EDGE_BOOST_COMPAT_MAX,
  EDGE_BOOST_COMPAT_MIN,
  EDGE_BOOST_MAX_FRICTION,
  EDGE_BOOST_RAW_DELTA,
  EXPLAIN_CHIP_LIMIT,
  FRICTION_MIN_WHEN_BALANCE_LOW,
  FRICTION_MIN_WHEN_BALANCE_MID,
  FRICTION_RISK_SCALE,
  HARD_SCORE_CAP_90,
  LOW_EVIDENCE_COVERAGE_PERCENT,
  LOW_EVIDENCE_FRICTION_FLOOR,
  LOW_EVIDENCE_MIN_PRESENT,
  MATCH_DEBUG_LOG_LIMIT,
  NUANCE_GAP_MAX,
  NUANCE_GAP_MIN,
  NUANCE_PENALTY,
  RELATIONSHIP_FIT_GREEN_BOOST,
  RELATIONSHIP_FIT_LOW_BALANCE_PENALTY,
  VALUES_ALIGNMENT_FOR_COMPAT_CAP,
  VERY_LOW_COVERAGE_CONFIDENCE_CAP,
  VERY_LOW_COVERAGE_PERCENT,
} from './matching-algorithm.constants';

export type { MatchInfoFlag };
export type { MatchExplainabilityDto } from './match-explainability';
export type { MatchRecommendationDto } from './match-recommendation';

/** Single penalty or bonus entry for debug audit. */
export interface MatchDebugPenaltyDto {
  reason: string;
  amount: number;
}

/** Debug audit: full reason breakdown per match (policy tuning, observability). */
export interface MatchDebugDto {
  baseScore: number;
  coveragePercent: number;
  scoreCoverageFactor: number;
  coverageFactor: number;
  confidence: number;
  infoFlags: MatchInfoFlag[];
  balanceRatio: number;
  dealbreakers: Dealbreaker[];
  penalties: MatchDebugPenaltyDto[];
  bonuses: MatchDebugPenaltyDto[];
  finalScoreBeforeClamp: number;
  finalScore: number;
  /** Internal: pipeline stages that contributed (debugging only). */
  provenance?: string[];
}

export interface CompareAlignmentDto {
  key: string;
  pairScore: number;
}

export interface CompareTensionDto {
  key: string;
  gap: number;
  text: string;
}

/** One tension from the tension matrix (rule-based). */
export interface TensionMatrixEntryDto {
  id: string;
  name: string;
  penalty: number;
  explain: string;
}

export interface CompareResultDto {
  aToB: number;
  bToA: number;
  relationshipStyle: number;
  coverage: number;
  frictionRisk: number;
  /** New scoring model */
  compatibility: number;
  /** Tier-1 values alignment (0–100, uncapped); blend uses valuesAlignmentForCompat (cap 85). */
  valuesAlignment: number;
  /** Jaccard interest overlap (0–100); blend weight 0.08. */
  interestAlignment: number;
  finalScore: number;
  /** Raw score before final clamp path (compatibility − friction penalty ± edge boost; no coverage multiplier). */
  rawScore: number;
  friction: number;
  frictionPenalty: number;
  coveragePercent: number;
  /** Light score weighting from coverage (85%-100%). */
  scoreCoverageFactor: number;
  /** Reliability of the score for sparse/partial data (70%-100%). */
  confidence: number;
  /** Low-information output flags (kept separate from score). */
  infoFlags: MatchInfoFlag[];
  coverageFactor: number;
  alignments: CompareAlignmentDto[];
  tensions: CompareTensionDto[];
  /** Tension matrix (rule-based) results. */
  tensionMatrix: TensionMatrixEntryDto[];
  /** Derived context per profile (occupationClass, visibilityNeed, lifeStage). */
  derived?: {
    a: {
      occupationClass?: string;
      visibilityNeed?: number;
      lifeStage?: number;
    };
    b: {
      occupationClass?: string;
      visibilityNeed?: number;
      lifeStage?: number;
    };
  };
  /** Dealbreaker codes and severity. */
  dealbreakers?: Dealbreaker[];
  /** Relationship balance (positive/negative score and ratio). */
  balance?: RelationshipBalanceResult;
  /** Debug audit: baseScore, coverage, balance, penalties, bonuses, finalScore breakdown. */
  debug?: MatchDebugDto;
  /** When coverage < 50%, score before sparse-match calibration (for reporting). */
  finalScoreBeforeSparseCalibration?: number;
  /** Human-readable chips + one-line reason (deterministic; no scoring impact). */
  explainability: MatchExplainabilityDto;
  /** User-facing recommendation layer above explainability (deterministic; no scoring impact). */
  recommendation: MatchRecommendationDto;
}

export interface CompareNotAnalyzedResultDto {
  status: 'NOT_ANALYZED';
  message: string;
  compatibility: null;
  partnerFit: null;
  relationshipFit: null;
  coverage: null;
  friction: null;
  finalScore: null;
}

export interface CompareInsufficientDataResultDto {
  status: 'INSUFFICIENT_DATA';
  message: string;
  compatibility: null;
  partnerFit: null;
  relationshipFit: null;
  coverage: null;
  friction: null;
  finalScore: null;
}

export type CompareGuardFailureResultDto =
  | CompareNotAnalyzedResultDto
  | CompareInsufficientDataResultDto;

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

function formatSignalKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function clampTo100(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
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

/** MATCH_DEBUG=1: log debug object for first 50 matches only; default 0 = no per-match logs. */
let matchDebugLogCount = 0;

function shouldLogMatchDebug(): boolean {
  if (process.env.MATCH_DEBUG !== '1') return false;
  if (matchDebugLogCount >= MATCH_DEBUG_LOG_LIMIT) return false;
  matchDebugLogCount += 1;
  return true;
}

/* ─── Stage 1: Derive profile contexts and enriched signals ───────────────── */

interface ProfileContextsAndEnriched {
  signalsA: Record<string, number | null>;
  signalsB: Record<string, number | null>;
  ctxA: ReturnType<typeof resolveDerivedContext>;
  ctxB: ReturnType<typeof resolveDerivedContext>;
  enrichedA: EnrichedSignals;
  enrichedB: EnrichedSignals;
}

function deriveProfileContextsAndEnrichedSignals(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
): ProfileContextsAndEnriched {
  const signalsA = profileA.evaluation?.self?.signals ?? {};
  const signalsB = profileB.evaluation?.self?.signals ?? {};
  const ctxA = resolveDerivedContext(profileA.evaluation, profileA.texts ?? {});
  const ctxB = resolveDerivedContext(profileB.evaluation, profileB.texts ?? {});
  const enrichedA = applyKeywordTriggers(signalsA, {
    aboutMe: profileA.texts?.aboutMe,
    aboutRelationship: profileA.texts?.aboutRelationship,
  });
  const enrichedB = applyKeywordTriggers(signalsB, {
    aboutMe: profileB.texts?.aboutMe,
    aboutRelationship: profileB.texts?.aboutRelationship,
  });
  return { signalsA, signalsB, ctxA, ctxB, enrichedA, enrichedB };
}

/* ─── Stage 2: Compute dealbreakers and relationship balance ─────────────── */

interface DealbreakersAndBalance {
  dealbreakers: Dealbreaker[];
  balance: RelationshipBalanceResult;
}

function computeDealbreakersAndBalance(
  signalsA: Record<string, number | null>,
  ctxA: ReturnType<typeof resolveDerivedContext>,
  signalsB: Record<string, number | null>,
  ctxB: ReturnType<typeof resolveDerivedContext>,
): DealbreakersAndBalance {
  const dealbreakers = computeDealbreakers({
    a: { signals: signalsA as CoreSignals, ctx: ctxA },
    b: { signals: signalsB as CoreSignals, ctx: ctxB },
  });
  const balance = computeRelationshipBalance({
    signalsA: signalsA as CoreSignals,
    signalsB: signalsB as CoreSignals,
    dealbreakers,
  });
  return { dealbreakers, balance };
}

/* ─── Stage 3: Compute directional compatibility ─────────────────────────── */

interface DirectionalCompatibility {
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

function computeDirectionalCompatibility(
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

/* ─── Stage 4: Compute coverage / asymmetry / low-evidence adjustments ───── */

interface CoverageAsymmetryLowEvidence {
  aToBForCompat: number;
  bToAForCompat: number;
  friction: number;
  frictionRisk: number;
  baseFriction: number;
  tensionMatrix: TensionMatrixEntryDto[];
}

function computeCoverageAsymmetryLowEvidenceAdjustments(
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

/* ─── Stage 6: Compute relationship fit and values alignment ───────────────── */

interface RelationshipFitAndValuesAlignment {
  relationshipFit: number;
  valuesAlignment: number;
  valuesAlignmentForCompat: number;
}

function computeRelationshipFitAndValuesAlignment(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
  balance: RelationshipBalanceResult,
): RelationshipFitAndValuesAlignment {
  let relationshipFit = Math.round(
    ((profileA.evaluation?.productScores?.relationshipFitScore ?? 0) +
      (profileB.evaluation?.productScores?.relationshipFitScore ?? 0)) /
      2,
  );
  if (balance.ratio >= BALANCE_RATIO_MID) {
    relationshipFit = Math.min(
      100,
      relationshipFit + RELATIONSHIP_FIT_GREEN_BOOST,
    );
  } else if (balance.ratio < BALANCE_RATIO_LOW) {
    relationshipFit = Math.max(
      0,
      relationshipFit - RELATIONSHIP_FIT_LOW_BALANCE_PENALTY,
    );
  }
  relationshipFit = clampTo100(relationshipFit);
  const signalsA = profileA.evaluation?.self?.signals ?? {};
  const signalsB = profileB.evaluation?.self?.signals ?? {};
  const valuesAlignment = computeValuesAlignment(signalsA, signalsB);
  const valuesAlignmentForCompat = Math.min(
    VALUES_ALIGNMENT_FOR_COMPAT_CAP,
    valuesAlignment,
  );
  return { relationshipFit, valuesAlignment, valuesAlignmentForCompat };
}

/* ─── Stage 7: Compute compatibility and nuance penalties ──────────────────── */

function computeCompatibilityAndNuancePenalties(
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

/* ─── Stage 10: Build debug DTO ────────────────────────────────────────── */

function buildDebugDto(
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

/* ─── Stage 11: Build final result DTO ──────────────────────────────────── */

function buildFinalResultDto(
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

  const explainability = buildMatchExplainability({
    compatibility: compatibilityValue,
    finalScore: finalScoreClamped,
    friction,
    breakdown: compatAB.breakdown ?? [],
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
