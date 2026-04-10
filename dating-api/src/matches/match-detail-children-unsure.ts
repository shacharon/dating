import type { PrismaService } from '../prisma/prisma.service';
import { evaluateHolyGrailDirectional } from '../holy-grail-matching/eligibility.evaluator';
import { mapProfileSourceToMatchingCanonical } from '../holy-grail-matching/profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromDbRow } from '../holy-grail-matching/retrieval/holy-grail-structured-db-json';

export interface MatchDetailChildrenUnsureFlags {
  readonly profile_a_to_profile_b: boolean;
  readonly profile_b_to_profile_a: boolean;
}

const FALSE_PAIR: MatchDetailChildrenUnsureFlags = {
  profile_a_to_profile_b: false,
  profile_b_to_profile_a: false,
};

/**
 * Holy Grail directional flags only — does not affect match scoring or filtering.
 * `profile_a_to_profile_b` = searcher A vs counterparty B yields MUST_WANT × UNSURE soft pass.
 */
export async function computeMatchDetailChildrenUnsure(
  prisma: PrismaService,
  profileIdA: string,
  profileIdB: string,
): Promise<MatchDetailChildrenUnsureFlags> {
  const rows = await prisma.userProfile.findMany({
    where: { id: { in: [profileIdA, profileIdB] } },
    include: {
      extractionV2: {
        select: { interests_self: true, interests: true, lifestyleTraits: true },
      },
    },
  });
  const rowA = rows.find((r) => r.id === profileIdA);
  const rowB = rows.find((r) => r.id === profileIdB);
  if (!rowA || !rowB) return FALSE_PAIR;

  try {
    const inputA = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: rowA.id,
      extractionV2: rowA.extractionV2,
      holyGrailStructuredFacts: rowA.holyGrailStructuredFacts,
      holyGrailStructuredPreferences: rowA.holyGrailStructuredPreferences,
    });
    const inputB = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: rowB.id,
      extractionV2: rowB.extractionV2,
      holyGrailStructuredFacts: rowB.holyGrailStructuredFacts,
      holyGrailStructuredPreferences: rowB.holyGrailStructuredPreferences,
    });
    const canonA = mapProfileSourceToMatchingCanonical(inputA);
    const canonB = mapProfileSourceToMatchingCanonical(inputB);
    const evaluatedAt = new Date();
    const aToB = evaluateHolyGrailDirectional({ searcher: canonA, counterparty: canonB, evaluatedAt });
    const bToA = evaluateHolyGrailDirectional({ searcher: canonB, counterparty: canonA, evaluatedAt });
    return {
      profile_a_to_profile_b: aToB.eligibilityFlags.children_unsure,
      profile_b_to_profile_a: bToA.eligibilityFlags.children_unsure,
    };
  } catch {
    return FALSE_PAIR;
  }
}
