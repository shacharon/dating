import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT } from '../holy-grail-matching/holy-grail-ranking-signal-self.select';
import { evaluateHolyGrailPairDirections } from './holy-grail-pair-directions';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';
import { toCanonicalMatchId } from './match-id';
import { tryChildrenUnsureFromSnapshotRow } from './match-pair-hg-snapshot';

export type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';

/** Same ranking-signal DB slice as `PrismaHolyGrailProfileSourceRepository` / `hg-full-system-validation`. */
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
} satisfies Prisma.UserProfileSelect;

export interface MatchDetailChildrenUnsureFlags {
  readonly profile_a_to_profile_b: boolean;
  readonly profile_b_to_profile_a: boolean;
}

const FALSE_PAIR: MatchDetailChildrenUnsureFlags = {
  profile_a_to_profile_b: false,
  profile_b_to_profile_a: false,
};

/**
 * Holy Grail directional flags — list API applies optional hide + ranking penalty when true.
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

/** One DB round-trip; use for bulk list/ranking enrichment. */
export async function loadChildrenUnsureProfileRowMap(
  prisma: PrismaService,
): Promise<Map<string, ChildrenUnsureProfileRow>> {
  const rows = await prisma.userProfile.findMany({
    select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
  });
  return new Map(rows.map((r) => [r.id, r as ChildrenUnsureProfileRow]));
}

export async function computeMatchDetailChildrenUnsure(
  prisma: PrismaService,
  profileIdA: string,
  profileIdB: string,
): Promise<MatchDetailChildrenUnsureFlags> {
  const matchId = toCanonicalMatchId(profileIdA, profileIdB);
  const snap = await prisma.matchPairHgSnapshot.findUnique({ where: { matchId } });
  const parsed = tryChildrenUnsureFromSnapshotRow(snap);
  if (parsed) return parsed;

  const rows = await prisma.userProfile.findMany({
    where: { id: { in: [profileIdA, profileIdB] } },
    select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
  });
  const rowA = rows.find((r) => r.id === profileIdA);
  const rowB = rows.find((r) => r.id === profileIdB);
  if (!rowA || !rowB) return FALSE_PAIR;
  return computeMatchDetailChildrenUnsureFromRows(rowA, rowB);
}
