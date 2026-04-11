import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT } from '../holy-grail-matching/holy-grail-ranking-signal-self.select';
import { evaluateHolyGrailPairDirections } from './holy-grail-pair-directions';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';
import { toCanonicalMatchId } from './match-id';
import {
  classifyChildrenUnsureFromSnapshot,
  classifyHolyGrailDiagnosticsFromSnapshot,
  resolvePairHgFieldsFromSnapshotClassifications,
  type HgPairResolutionTelemetry,
} from './match-pair-hg-snapshot';
import type { HolyGrailMatchDiagnosticsDto } from './match.types';

export type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';

/**
 * Same ranking-signal DB slice as `PrismaHolyGrailProfileSourceRepository` / `hg-full-system-validation`.
 * Match **list** runtime uses `ProfilesPrismaService.loadMatchListProfileData` (superset select); detail/snapshot
 * paths keep using this shape via `findMany` / `findUnique` as before.
 *
 * `children_unsure` is HG-owned for UX (badges, optional `hideChildrenUnsure` list filter) — not legacy dealbreakers
 * and not a list ranking lever (`MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1`; see `domain/kids-family-ownership.ts`).
 */
export const CHILDREN_UNSURE_PROFILE_ROW_SELECT = {
  id: true,
  aboutMe: true,
  aboutPartner: true,
  holyGrailStructuredFacts: true,
  holyGrailStructuredPreferences: true,
  extractionV2: {
    select: { interests_self: true, interests: true, lifestyleTraits: true },
  },
  signalSnapshots: {
    where: { domain: 'self' as const },
    select: HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT,
  },
} satisfies Prisma.MatchmakingProfileSelect;

export interface MatchDetailChildrenUnsureFlags {
  readonly profile_a_to_profile_b: boolean;
  readonly profile_b_to_profile_a: boolean;
}

const FALSE_PAIR: MatchDetailChildrenUnsureFlags = {
  profile_a_to_profile_b: false,
  profile_b_to_profile_a: false,
};

/**
 * Holy Grail directional flags for `children_unsure`. List API: optional `hideChildrenUnsure` response filter only;
 * production sort stays legacy-only (`HG_GATE_LEGACY_RANK_V1`).
 * `profile_a_to_profile_b` = searcher A vs counterparty B yields MUST_WANT × UNSURE soft pass.
 */
export function computeMatchDetailChildrenUnsureFromRows(
  rowA: ChildrenUnsureProfileRow,
  rowB: ChildrenUnsureProfileRow,
): MatchDetailChildrenUnsureFlags {
  const dirs = evaluateHolyGrailPairDirections(rowA, rowB);
  if (!dirs) return FALSE_PAIR;
  return {
    profile_a_to_profile_b: dirs.aToB.eligibilityFlags.children_unsure,
    profile_b_to_profile_a: dirs.bToA.eligibilityFlags.children_unsure,
  };
}

/** One DB round-trip; use for bulk list/detail HG profile slice loading. */
export async function loadChildrenUnsureProfileRowMap(
  prisma: PrismaService,
): Promise<Map<string, ChildrenUnsureProfileRow>> {
  const rows = await prisma.matchmakingProfile.findMany({
    select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
  });
  return new Map(rows.map((r) => [r.id, r as ChildrenUnsureProfileRow]));
}

export async function computeMatchDetailPairHg(
  prisma: PrismaService,
  profileIdA: string,
  profileIdB: string,
  preloadedRows?: {
    rowA: ChildrenUnsureProfileRow;
    rowB: ChildrenUnsureProfileRow;
  },
): Promise<{
  readonly children_unsure: MatchDetailChildrenUnsureFlags;
  readonly holyGrail?: HolyGrailMatchDiagnosticsDto;
  readonly telemetry: HgPairResolutionTelemetry;
}> {
  const matchId = toCanonicalMatchId(profileIdA, profileIdB);
  const snap = await prisma.matchPairHgSnapshot.findUnique({
    where: { matchId },
  });
  const childClass = classifyChildrenUnsureFromSnapshot(snap);
  const diagClass = classifyHolyGrailDiagnosticsFromSnapshot(snap);
  if (childClass.ok && diagClass.ok) {
    const telemetry: HgPairResolutionTelemetry = {
      matchId,
      childrenSource: 'snapshot',
      diagnosticsSource: 'snapshot',
      liveEvalRan: false,
      snapshotRowPresent: snap != null,
      snapshotPolicyCurrent: true,
      snapshotChildrenReject: undefined,
      snapshotDiagnosticsReject: undefined,
    };
    return {
      children_unsure: childClass.dto,
      holyGrail: diagClass.dto,
      telemetry,
    };
  }

  let rowA: ChildrenUnsureProfileRow | undefined;
  let rowB: ChildrenUnsureProfileRow | undefined;
  if (preloadedRows) {
    rowA = preloadedRows.rowA;
    rowB = preloadedRows.rowB;
  } else {
    const rows = await prisma.matchmakingProfile.findMany({
      where: { id: { in: [profileIdA, profileIdB] } },
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
    });
    rowA = rows.find((r) => r.id === profileIdA) as
      | ChildrenUnsureProfileRow
      | undefined;
    rowB = rows.find((r) => r.id === profileIdB) as
      | ChildrenUnsureProfileRow
      | undefined;
  }
  const resolved = resolvePairHgFieldsFromSnapshotClassifications({
    matchId,
    snapshot: snap,
    rowA: rowA,
    rowB: rowB,
    childClass,
    diagClass,
  });
  return {
    children_unsure: resolved.children_unsure,
    holyGrail: resolved.holyGrail,
    telemetry: resolved.telemetry,
  };
}

export async function computeMatchDetailChildrenUnsure(
  prisma: PrismaService,
  profileIdA: string,
  profileIdB: string,
): Promise<MatchDetailChildrenUnsureFlags> {
  const { children_unsure } = await computeMatchDetailPairHg(
    prisma,
    profileIdA,
    profileIdB,
  );
  return children_unsure;
}
