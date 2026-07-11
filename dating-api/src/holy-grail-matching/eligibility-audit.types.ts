import type { MatchingDimensionResult } from './matching-dimension-result';
import type { HolyGrailDimensionKey } from './holy-grail-dimensions';

/** One row per evaluated dimension — for logs, support, and future UI debug panels. */
export interface HolyGrailDimensionAuditRow {
  readonly dimension: HolyGrailDimensionKey;
  readonly result: MatchingDimensionResult;
  /** Optional short code for tooling (no scoring). */
  readonly ruleRef?: string;
}

/** Classifier-derived hard dealbreaker/requirement row with evidence trail. */
export interface HolyGrailDealbreakerAuditRow {
  readonly tag: string;
  readonly result: MatchingDimensionResult;
  readonly classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
  readonly evidence: string;
  readonly confidence: number;
  readonly reasonCode: string;
  /** True when kill-switch or confidence floor demoted this tag before eval. */
  readonly guardrailDemoted?: boolean;
}

/**
 * Layer 4 — Serializable audit bundle for one directional evaluation.
 * Version independently from `matching_canonical_v1`.
 * Additive optional `dealbreakerDimensions` (Sprint 17 Story 3).
 */
export interface HolyGrailEligibilityAuditV1 {
  readonly auditVersion: 'holy_grail_eligibility_audit_v1';
  readonly engineId: 'holy_grail_eligibility_v1';
  readonly evaluatedAt: string;
  readonly direction: 'searcher_to_counterparty';
  readonly searcherProfileId: string;
  readonly counterpartyProfileId: string;
  readonly dimensions: readonly HolyGrailDimensionAuditRow[];
  /** Present when searcher had hard dealbreaker dims (post-guardrail). */
  readonly dealbreakerDimensions?: readonly HolyGrailDealbreakerAuditRow[];
}
