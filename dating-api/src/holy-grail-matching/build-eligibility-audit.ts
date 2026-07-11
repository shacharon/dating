import type {
  HolyGrailEligibilityAuditV1,
  HolyGrailDimensionAuditRow,
  HolyGrailDealbreakerAuditRow,
} from './eligibility-audit.types';
import type { HolyGrailDimensionKey } from './holy-grail-dimensions';
import type { MatchingDimensionResult } from './matching-dimension-result';
import {
  MatchingDimensionResults,
} from './matching-dimension-result';
import type { HolyGrailDimensionEvaluation } from './eligibility.evaluator';
import type { DealbreakerEligibilitySignal } from './dealbreaker-eligibility';

function statusToMatchingResult(
  status: HolyGrailDimensionEvaluation['status'],
): MatchingDimensionResult {
  if (status === 'PASS' || status === 'SOFT_PASS') {
    return MatchingDimensionResults.MATCH;
  }
  if (status === 'FAIL') return MatchingDimensionResults.NO_MATCH;
  if (status === 'UNKNOWN') return MatchingDimensionResults.UNKNOWN;
  return MatchingDimensionResults.SKIPPED;
}

/**
 * Layer 4 (observability) — Pure formatter: dimension map → audit DTO. No I/O, no LLM, no old engine.
 */
export function buildHolyGrailEligibilityAuditV1(args: {
  searcherProfileId: string;
  counterpartyProfileId: string;
  evaluatedAt: Date;
  dimensions: Record<HolyGrailDimensionKey, MatchingDimensionResult>;
  dealbreakerDimensions?: Readonly<
    Record<string, HolyGrailDimensionEvaluation>
  >;
  /** Post-guardrail HARD_* signals (for evidence/confidence join). */
  searcherHardSignals?: readonly DealbreakerEligibilitySignal[];
}): HolyGrailEligibilityAuditV1 {
  const rows: HolyGrailDimensionAuditRow[] = (
    Object.entries(args.dimensions) as [
      HolyGrailDimensionKey,
      MatchingDimensionResult,
    ][]
  ).map(([dimension, result]) => ({ dimension, result }));

  const audit: HolyGrailEligibilityAuditV1 = {
    auditVersion: 'holy_grail_eligibility_audit_v1',
    engineId: 'holy_grail_eligibility_v1',
    evaluatedAt: args.evaluatedAt.toISOString(),
    direction: 'searcher_to_counterparty',
    searcherProfileId: args.searcherProfileId,
    counterpartyProfileId: args.counterpartyProfileId,
    dimensions: rows,
  };

  const dbDims = args.dealbreakerDimensions;
  if (dbDims && Object.keys(dbDims).length > 0) {
    const signalByTag = new Map<string, DealbreakerEligibilitySignal>(
      (args.searcherHardSignals ?? []).map((s) => [s.tag, s]),
    );
    const dealbreakerRows: HolyGrailDealbreakerAuditRow[] = Object.entries(
      dbDims,
    ).map(([tag, dim]) => {
      const signal = signalByTag.get(tag);
      const classification =
        signal?.classification === 'HARD_REQUIRE'
          ? 'HARD_REQUIRE'
          : 'HARD_EXCLUDE';
      return {
        tag,
        result: statusToMatchingResult(dim.status),
        classification,
        evidence: signal?.evidence ?? '',
        confidence: signal?.confidence ?? 0,
        reasonCode: dim.reasonCode,
      };
    });
    return { ...audit, dealbreakerDimensions: dealbreakerRows };
  }

  return audit;
}
