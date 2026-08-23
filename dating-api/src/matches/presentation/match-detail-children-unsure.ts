import type { PrismaService } from '../../prisma/prisma.service';
import { evaluateHolyGrailPairDirections } from '../holy-grail/holy-grail-pair-directions';
import type { ChildrenUnsureProfileRow } from '../children-unsure/children-unsure-profile-row.types';
import { toCanonicalMatchId } from '../engine/match-id';
import {
  classifyChildrenUnsureFromSnapshot,
  classifyHolyGrailDiagnosticsFromSnapshot,
  resolvePairHgFieldsFromSnapshotClassifications,
  type HgPairResolutionTelemetry,
} from '../compare/match-pair-hg-snapshot';
import type { HolyGrailMatchDiagnosticsDto } from '../match.types';

export type { ChildrenUnsureProfileRow } from '../children-unsure/children-unsure-profile-row.types';

interface LegacyMatchmakingProfileSelect {
  id: true;
  aboutMe: true;
  aboutPartner: true;
  holyGrailStructuredFacts: true;
  holyGrailStructuredPreferences: true;
}

/**
 * Same ranking-signal DB slice as `PrismaHolyGrailProfileSourceRepository` / `hg-full-system-validation`.
 * Match **list** runtime uses `ProfilesPrismaService.loadMatchListProfileData` (superset select); detail/snapshot
 * paths use this shape via `findMany` on profiles; persisted pair snapshots are not read (pre–Migration 3).
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
} as const satisfies LegacyMatchmakingProfileSelect;

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
  void prisma;
  // Slice 8: MatchmakingProfile reads disabled.
  return new Map();
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
  // Pair HG snapshot table removed (Migration 3); live eval via resolvePairHgFieldsFromSnapshotClassifications.
  const snap = null;
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
    // Slice 8: MatchmakingProfile reads disabled.
    const rows: ChildrenUnsureProfileRow[] = [];
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
