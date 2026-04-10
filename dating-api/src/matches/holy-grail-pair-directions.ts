import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';
import { evaluateHolyGrailDirectional } from '../holy-grail-matching/eligibility.evaluator';
import { mapProfileSourceToMatchingCanonical } from '../holy-grail-matching/profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../holy-grail-matching/retrieval/holy-grail-structured-db-json';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';

/**
 * Runs HG Layer-3 twice per pair (A→B, B→A). Shared by list enrichment, detail, and snapshot persistence.
 * Uses production `evaluateHolyGrailDirectional` only. Eligibility policy: `docs/HOLY_GRAIL_MATCHING.md` § “Locked Layer 3 policy”.
 */
export function evaluateHolyGrailPairDirections(
  rowA: ChildrenUnsureProfileRow,
  rowB: ChildrenUnsureProfileRow,
  evaluatedAt: Date = new Date(),
): { aToB: HolyGrailDirectionalEvaluationResult; bToA: HolyGrailDirectionalEvaluationResult } | null {
  try {
    const inputA = buildHolyGrailProfileMappingInputFromRankingAwareDbRow(rowA);
    const inputB = buildHolyGrailProfileMappingInputFromRankingAwareDbRow(rowB);
    const canonA = mapProfileSourceToMatchingCanonical(inputA);
    const canonB = mapProfileSourceToMatchingCanonical(inputB);
    const aToB = evaluateHolyGrailDirectional({ searcher: canonA, counterparty: canonB, evaluatedAt });
    const bToA = evaluateHolyGrailDirectional({ searcher: canonB, counterparty: canonA, evaluatedAt });
    return { aToB, bToA };
  } catch {
    return null;
  }
}
