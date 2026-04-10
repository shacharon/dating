import type { MatchPairHgSnapshot } from '@prisma/client';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';
import { HOLY_GRAIL_DIMENSION_KEYS } from '../holy-grail-matching/holy-grail-dimensions';
import type { PrismaService } from '../prisma/prisma.service';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';
import { HG_LIST_PRODUCT_POLICY_VERSION } from './children-unsure.product-policy';
import { evaluateHolyGrailPairDirections } from './holy-grail-pair-directions';
import type { ChildrenUnsureDirectionsDto, MatchRecordDto } from './match.types';
import { anyChildrenUnsure } from './children-unsure.helpers';

const HG_CHILDREN_STATUS_SEP = ':';

/**
 * ## Source of truth
 *
 * - **Algorithmic**: Holy Grail directional evaluation (`evaluateHolyGrailPairDirections`) — unchanged evaluator.
 * - **Operational (list/detail)**: Row in `match_pair_hg_snapshot` when `hgPolicyVersion === HG_LIST_PRODUCT_POLICY_VERSION`
 *   and `hgChildrenStatus` parses — avoids recomputing HG on every list request after rebuild.
 * - **Fallback**: If snapshot missing, stale version, or parse error → same live evaluation as before persistence existed.
 */

export type PairHgSnapshotUpsertInput = {
  readonly matchId: string;
  readonly childrenUnsure: boolean;
  readonly hgChildrenStatus: string;
  readonly hgOverallStatus: string;
  readonly hgSoftPassCount: number;
  readonly hgRankPenaltyApplied: boolean;
  readonly hgPolicyVersion: string;
};

function countSoftPasses(aToB: HolyGrailDirectionalEvaluationResult, bToA: HolyGrailDirectionalEvaluationResult): number {
  let n = 0;
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    if (aToB.dimensions[k].status === 'SOFT_PASS') n += 1;
    if (bToA.dimensions[k].status === 'SOFT_PASS') n += 1;
  }
  return n;
}

export function buildPairHgSnapshotPayload(
  matchId: string,
  aToB: HolyGrailDirectionalEvaluationResult,
  bToA: HolyGrailDirectionalEvaluationResult,
): PairHgSnapshotUpsertInput {
  const chA = aToB.dimensions.PARTNER_WANTS_CHILDREN.status;
  const chB = bToA.dimensions.PARTNER_WANTS_CHILDREN.status;
  const hgChildrenStatus = `${chA}${HG_CHILDREN_STATUS_SEP}${chB}`;
  const hgOverallStatus = `${aToB.overallHardEligibility}${HG_CHILDREN_STATUS_SEP}${bToA.overallHardEligibility}`;
  const profile_a_to_profile_b = aToB.eligibilityFlags.children_unsure;
  const profile_b_to_profile_a = bToA.eligibilityFlags.children_unsure;
  const dto: ChildrenUnsureDirectionsDto = {
    profile_a_to_profile_b,
    profile_b_to_profile_a,
  };
  const childrenUnsure = anyChildrenUnsure(dto);
  return {
    matchId,
    childrenUnsure,
    hgChildrenStatus,
    hgOverallStatus,
    hgSoftPassCount: countSoftPasses(aToB, bToA),
    hgRankPenaltyApplied: childrenUnsure,
    hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
  };
}

const VALID_CHILD_DIM = new Set(['PASS', 'FAIL', 'SKIPPED', 'SOFT_PASS']);

/** Returns directions when snapshot is usable; otherwise null → caller runs live HG. */
export function tryChildrenUnsureFromSnapshotRow(
  row: MatchPairHgSnapshot | null | undefined,
): ChildrenUnsureDirectionsDto | null {
  if (!row?.hgPolicyVersion || row.hgPolicyVersion !== HG_LIST_PRODUCT_POLICY_VERSION) return null;
  if (row.hgChildrenStatus == null || row.hgChildrenStatus === '') return null;
  const parts = row.hgChildrenStatus.split(HG_CHILDREN_STATUS_SEP);
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!VALID_CHILD_DIM.has(a) || !VALID_CHILD_DIM.has(b)) return null;
  return {
    profile_a_to_profile_b: a === 'SOFT_PASS',
    profile_b_to_profile_a: b === 'SOFT_PASS',
  };
}

export function resolveChildrenUnsureForPair(args: {
  readonly snapshot: MatchPairHgSnapshot | null | undefined;
  readonly rowA: ChildrenUnsureProfileRow | undefined;
  readonly rowB: ChildrenUnsureProfileRow | undefined;
}): ChildrenUnsureDirectionsDto {
  const fromDb = tryChildrenUnsureFromSnapshotRow(args.snapshot ?? null);
  if (fromDb) return fromDb;
  if (args.rowA && args.rowB) {
    const dirs = evaluateHolyGrailPairDirections(args.rowA, args.rowB);
    if (dirs) {
      return {
        profile_a_to_profile_b: dirs.aToB.eligibilityFlags.children_unsure,
        profile_b_to_profile_a: dirs.bToA.eligibilityFlags.children_unsure,
      };
    }
  }
  return { profile_a_to_profile_b: false, profile_b_to_profile_a: false };
}

const UPSERT_CHUNK = 40;

export async function upsertMatchPairHgSnapshots(
  prisma: PrismaService,
  records: MatchRecordDto[],
  profileMap: Map<string, ChildrenUnsureProfileRow>,
): Promise<{ written: number; skipped: number }> {
  const payloads: PairHgSnapshotUpsertInput[] = [];
  let skipped = 0;
  const evaluatedAt = new Date();
  for (const r of records) {
    const rowA = profileMap.get(r.aId);
    const rowB = profileMap.get(r.bId);
    if (!rowA || !rowB) {
      skipped += 1;
      continue;
    }
    const dirs = evaluateHolyGrailPairDirections(rowA, rowB, evaluatedAt);
    if (!dirs) {
      skipped += 1;
      continue;
    }
    payloads.push(buildPairHgSnapshotPayload(r.matchId, dirs.aToB, dirs.bToA));
  }

  for (let i = 0; i < payloads.length; i += UPSERT_CHUNK) {
    const chunk = payloads.slice(i, i + UPSERT_CHUNK);
    await prisma.$transaction(
      chunk.map((p) =>
        prisma.matchPairHgSnapshot.upsert({
          where: { matchId: p.matchId },
          create: {
            matchId: p.matchId,
            childrenUnsure: p.childrenUnsure,
            hgChildrenStatus: p.hgChildrenStatus,
            hgOverallStatus: p.hgOverallStatus,
            hgSoftPassCount: p.hgSoftPassCount,
            hgRankPenaltyApplied: p.hgRankPenaltyApplied,
            hgPolicyVersion: p.hgPolicyVersion,
          },
          update: {
            childrenUnsure: p.childrenUnsure,
            hgChildrenStatus: p.hgChildrenStatus,
            hgOverallStatus: p.hgOverallStatus,
            hgSoftPassCount: p.hgSoftPassCount,
            hgRankPenaltyApplied: p.hgRankPenaltyApplied,
            hgPolicyVersion: p.hgPolicyVersion,
          },
        }),
      ),
    );
  }

  return { written: payloads.length, skipped };
}

export async function loadMatchPairHgSnapshotMap(
  prisma: PrismaService,
  matchIds: readonly string[],
): Promise<Map<string, MatchPairHgSnapshot>> {
  if (matchIds.length === 0) return new Map();
  const rows = await prisma.matchPairHgSnapshot.findMany({
    where: { matchId: { in: [...matchIds] } },
  });
  return new Map(rows.map((r) => [r.matchId, r]));
}
