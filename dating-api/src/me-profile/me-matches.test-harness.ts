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
import { RankingAssembleService } from './matches/match-ranking/ranking-assemble.service';
import { RankingLoadService } from './matches/match-ranking/ranking-load.service';
import { RankingScorerService } from './matches/match-ranking/ranking-scorer.service';
import { RankingTelemetryService } from './matches/match-ranking/ranking-telemetry.service';
import { MatchListCacheService } from './matches/match-list-cache.service';
import { MatchDetailService } from './matches/match-detail.service';
import { PrismaMatchRepository } from './repositories/prisma-match.repository';

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
  const matches = new PrismaMatchRepository(deps.prisma);
  const query = new MatchListQueryService(
    matches,
    matches,
    deps.obs,
    deps.analytics,
  );
  const eligibility = new MatchEligibilityService(matches, deps.obs);
  const pairMatchPolicy = new HgGateLegacyRankPolicy();
  const loader = new RankingLoadService(matches, deps.obs, deps.analytics);
  const scorer = new RankingScorerService(deps.obs, eligibility, pairMatchPolicy);
  const assembler = new RankingAssembleService(matches, eligibility);
  const telemetry = new RankingTelemetryService(deps.obs, deps.analytics);
  const ranking = new MatchRankingService(
    loader,
    scorer,
    assembler,
    telemetry,
    matches,
  );
  const cacheSvc = new MatchListCacheService(
    matches,
    deps.obs,
    deps.analytics,
    deps.cache,
    query,
    ranking,
    deps.matchListRankQueue,
  );
  const detail = new MatchDetailService(
    matches,
    deps.obs,
    deps.photoStorage,
    deps.mutualMatches,
    deps.matchNarrativeGenerator,
    deps.matchNarrativeCache,
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
