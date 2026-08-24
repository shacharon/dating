import type { CacheKvPort } from '../../../cache/cache.ports';
import type { AnalyticsService } from '../../../analytics/analytics.service';
import type { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import type { PhotoStorage } from '../../../photo-storage/photo-storage.types';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { MatchListRankQueuePort } from '../../../workers/match-list-rank.ports';
import type { MatchNarrativeCacheService } from '../../../matches/match-narrative';
import type { MatchNarrativeGenerator } from '../../../matches/match-narrative';
import { HgGateLegacyRankPolicy } from '../../../matching-policy/hg-gate-legacy-rank.policy';
import type { MutualMatchesService } from '../actions/mutual-matches.service';
import { MeMatchesService } from '../core/me-matches.service';
import { MatchListQueryService } from '../list/match-list-query.service';
import { MatchEligibilityService } from '../detail/match-eligibility.service';
import { MatchListCandidateLoaderService } from '../list/ranking/match-list-candidate-loader.service';
import { MatchListCandidateScorerService } from '../list/ranking/match-list-candidate-scorer.service';
import { MatchListResponseAssemblerService } from '../list/ranking/match-list-response-assembler.service';
import { MatchListRankTelemetryService } from '../list/ranking/match-list-rank-telemetry.service';
import { MatchRankingService } from '../list/ranking/match-ranking.service';
import { MatchListCacheService } from '../list/match-list-cache.service';
import { MatchDetailQueryService } from '../detail/match-detail-query.service';
import { MatchDetailPhotoService } from '../detail/match-detail-photo.service';
import { MatchDetailService } from '../detail/match-detail.service';
import { PrismaMatchRepository } from '../../repositories/prisma-match.repository';

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
  const loader = new MatchListCandidateLoaderService(
    matches,
    deps.obs,
    deps.analytics,
  );
  const scorer = new MatchListCandidateScorerService(
    deps.obs,
    eligibility,
    pairMatchPolicy,
  );
  const assembler = new MatchListResponseAssemblerService(
    matches,
    eligibility,
  );
  const telemetry = new MatchListRankTelemetryService(deps.obs, deps.analytics);
  const ranking = new MatchRankingService(
    matches,
    matches,
    deps.obs,
    loader,
    scorer,
    assembler,
    telemetry,
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
  const photo = new MatchDetailPhotoService(
    matches,
    deps.photoStorage,
    deps.mutualMatches,
    eligibility,
    deps.obs,
  );
  const detailQuery = new MatchDetailQueryService(
    matches,
    deps.obs,
    deps.mutualMatches,
    deps.matchNarrativeGenerator,
    deps.matchNarrativeCache,
    eligibility,
    pairMatchPolicy,
  );
  const detail = new MatchDetailService(detailQuery, photo);
  return new MeMatchesService(
    deps.obs,
    eligibility,
    ranking,
    cacheSvc,
    detail,
  );
}
