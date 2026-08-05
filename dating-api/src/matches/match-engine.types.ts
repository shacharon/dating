/**
 * Public compare DTO types (Sprint 40 Story 1 — extracted from match-engine facade).
 */

import type { Dealbreaker } from '../domain/dealbreakers';
import type { RelationshipBalanceResult } from '../domain/relationshipBalance';
import type { MatchInfoFlag } from './coverage-policy';
import type { CompatibilityBreakdownDto } from './match-compatibility-breakdown';
import type { MatchExplainabilityDto } from './match-explainability';
import type { MatchRecommendationDto } from './match-recommendation';

export type { MatchInfoFlag };
export type { CompatibilityBreakdownDto } from './match-compatibility-breakdown';
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
  /**
   * Sprint 43 — component scores + top signals for algorithm transparency.
   * Display only; section %s are not blend weights.
   */
  compatibilityBreakdown: CompatibilityBreakdownDto;
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
