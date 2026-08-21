import type { CacheKvPort } from '../cache/cache.ports';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import type { PrismaService } from '../prisma/prisma.service';
import type { MatchListRankQueuePort } from '../workers/match-list-rank.ports';
import type { MatchNarrativeCacheService } from '../matches/match-narrative';
import type { MatchNarrativeGenerator } from '../matches/match-narrative';
import { HgGateLegacyRankPolicy } from '../matching-policy/hg-gate-legacy-rank.policy';
import type { MutualMatchesService } from './mutual-matches.service';
import { MeMatchesService } from './me-matches.service';
import { MatchListQueryService } from './matches/match-list-query.service';
import { MatchEligibilityService } from './matches/match-eligibility.service';
import { MatchRankingService } from './matches/match-ranking.service';
import { MatchListCacheService } from './matches/match-list-cache.service';
import { MatchDetailService } from './matches/match-detail.service';

/** Collaborator dependencies, in the same order as the pre-split `MeMatchesService` constructor. */
export type MeMatchesServiceTestDeps = {
  prisma: PrismaService;
  obs: StructuredObservabilityService;
  photoStorage: PhotoStorage;
  mutualMatches: MutualMatchesService;
  analytics: AnalyticsService;
  cache: CacheKvPort;
  matchNarrativeGenerator: MatchNarrativeGenerator;
  matchNarrativeCache: MatchNarrativeCacheService;
  matchListRankQueue: MatchListRankQueuePort;
};

/**
 * Builds a `MeMatchesService` facade backed by real collaborators, so unit specs can
 * drive the whole matches path from leaf mocks without a Nest testing module.
 */
export function createMeMatchesServiceForTest(
  deps: MeMatchesServiceTestDeps,
): MeMatchesService {
  const query = new MatchListQueryService(
    deps.prisma,
    deps.obs,
    deps.analytics,
  );
  const eligibility = new MatchEligibilityService(
    deps.prisma,
    deps.obs,
    query,
  );
  const pairMatchPolicy = new HgGateLegacyRankPolicy();
  const ranking = new MatchRankingService(
    deps.prisma,
    deps.obs,
    deps.analytics,
    query,
    eligibility,
    pairMatchPolicy,
  );
  const cacheSvc = new MatchListCacheService(
    deps.prisma,
    deps.obs,
    deps.analytics,
    deps.cache,
    query,
    ranking,
    deps.matchListRankQueue,
  );
  const detail = new MatchDetailService(
    deps.prisma,
    deps.obs,
    deps.photoStorage,
    deps.mutualMatches,
    deps.matchNarrativeGenerator,
    deps.matchNarrativeCache,
    query,
    eligibility,
    pairMatchPolicy,
  );
  return new MeMatchesService(
    deps.obs,
    eligibility,
    ranking,
    cacheSvc,
    detail,
  );
}
