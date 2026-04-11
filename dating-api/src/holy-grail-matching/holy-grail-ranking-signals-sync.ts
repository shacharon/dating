import type { PrismaClient } from '@prisma/client';
import { interestsTopFallbackFromInterestsSelf } from './holy-grail-ranking-signals-from-db';

type PrismaSync = Pick<
  PrismaClient,
  'profileExtractionV2' | 'profileSignalSnapshot'
>;

/**
 * When extraction updates without a full profile evaluation save, refresh `hgRankingInterestsTop` only if it
 * is still empty (extraction-derived ranking). Preserves enrichment-derived lists already copied to HG columns.
 * Does not read `ProfileEvaluationRaw` — HG ranking enrichment must not live there.
 */
export async function syncProfileHgRankingSignalColumns(
  prisma: PrismaSync,
  profileId: string,
): Promise<void> {
  const [ext, selfSnap] = await Promise.all([
    prisma.profileExtractionV2.findUnique({
      where: { profileId },
      select: { interests_self: true },
    }),
    prisma.profileSignalSnapshot.findUnique({
      where: { profileId_domain: { profileId, domain: 'self' } },
      select: {
        lifestylePace: true,
        conflictStyle: true,
        hgRankingDailyRhythm: true,
        hgRankingAutonomyTogetherness: true,
        hgRankingInterestsTop: true,
      },
    }),
  ]);

  if (!selfSnap) return;

  const fallback = interestsTopFallbackFromInterestsSelf(ext?.interests_self);
  const nextInterests =
    selfSnap.hgRankingInterestsTop.length === 0
      ? fallback
      : [...selfSnap.hgRankingInterestsTop];

  await prisma.profileSignalSnapshot.updateMany({
    where: { profileId, domain: 'self' },
    data: {
      hgRankingDailyRhythm: selfSnap.hgRankingDailyRhythm,
      hgRankingAutonomyTogetherness: selfSnap.hgRankingAutonomyTogetherness,
      hgRankingInterestsTop: nextInterests,
    },
  });
}
