import type {
  HolyGrailEligibilityAuditV1,
  HolyGrailDimensionAuditRow,
} from './eligibility-audit.types';
import type { HolyGrailDimensionKey } from './holy-grail-dimensions';
import type { MatchingDimensionResult } from './matching-dimension-result';

/**
 * Layer 4 (observability) — Pure formatter: dimension map → audit DTO. No I/O, no LLM, no old engine.
 */
export function buildHolyGrailEligibilityAuditV1(args: {
  searcherProfileId: string;
  counterpartyProfileId: string;
  evaluatedAt: Date;
  dimensions: Record<HolyGrailDimensionKey, MatchingDimensionResult>;
}): HolyGrailEligibilityAuditV1 {
  const rows: HolyGrailDimensionAuditRow[] = (
    Object.entries(args.dimensions) as [
      HolyGrailDimensionKey,
      MatchingDimensionResult,
    ][]
  ).map(([dimension, result]) => ({ dimension, result }));

  return {
    auditVersion: 'holy_grail_eligibility_audit_v1',
    engineId: 'holy_grail_eligibility_v1',
    evaluatedAt: args.evaluatedAt.toISOString(),
    direction: 'searcher_to_counterparty',
    searcherProfileId: args.searcherProfileId,
    counterpartyProfileId: args.counterpartyProfileId,
    dimensions: rows,
  };
}
