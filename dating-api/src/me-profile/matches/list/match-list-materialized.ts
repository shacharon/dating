import type { AnalyticsService } from '../../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import {
  encodeMatchListCursor,
  type MatchListCursorPayload,
} from '../../../cache/match-list-cache';
import { ErrorCodes } from '../../../logging/error-codes';
import type { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import { recordMatchListLoadTimeMs } from '../../../observability/custom-metrics';
import type {
  MeMatchItemDto,
  MeMatchesListResponseDto,
} from '../../dto/me-matches-response.dto';
import {
  rebaseMeMatchListItemScore,
  toMeMatchesListNotReady,
  toMeMatchesListReady,
} from '../core/me-matches-response.mapper';
import type { MatchListQueryService } from './match-list-query.service';
import type { MatchRankingService } from './ranking/match-ranking.service';
import type { IMatchRankRepository } from '../../repositories/match.repository';

type MaterializedListDeps = {
  matches: Pick<IMatchRankRepository, 'countRanksForViewer'>;
  obs: StructuredObservabilityService;
  analytics: AnalyticsService;
  query: MatchListQueryService;
  ranking: MatchRankingService;
  maybeEnqueueListEmpty: (userId: string) => Promise<void>;
};

/**
 * Sprint 31 Story 4 — flagged path: DB cursor on MatchListRank + page hydrate.
 * Never calls getOrBuildRankedList / buildFullRankedList for the full pool.
 */
export async function listFromMaterializedRanks(
  deps: MaterializedListDeps,
  userId: string,
  cursor: MatchListCursorPayload | null,
  limit: number,
  started: number,
): Promise<MeMatchesListResponseDto> {
  const gate = await deps.query.resolveViewerListGate(userId);
  if (gate.status === 'not_ready') {
    recordMatchListLoadTimeMs(Date.now() - started);
    return toMeMatchesListNotReady(gate.reason);
  }

  const rankRows = await deps.query.fetchMatchListRankPage(
    userId,
    cursor,
    limit + 1,
  );
  if (rankRows.length === 0) {
    if (cursor == null) {
      await deps.maybeEnqueueListEmpty(userId);
    }
    recordMatchListLoadTimeMs(Date.now() - started);
    return toMeMatchesListReady({
      viewerProfileId: gate.viewerProfileId,
      viewerGender: gate.viewerGender,
      viewerAcceptedPartnerGenders: gate.viewerAcceptedPartnerGenders,
      viewerProfileAnalysisStale: gate.viewerProfileAnalysisStale,
      matches: [],
      nextCursor: null,
      hasMore: false,
    });
  }

  const hasMore = rankRows.length > limit;
  const pageRanks = hasMore ? rankRows.slice(0, limit) : rankRows;
  const pageIds = pageRanks.map((r) => r.candidateProfileId);

  const hydrated = await deps.ranking.buildFullRankedList(userId, {
    candidateProfileIds: pageIds,
    emitListAnalytics: false,
  });

  if (hydrated.status !== 'ready') {
    recordMatchListLoadTimeMs(Date.now() - started);
    return {
      ...hydrated,
      nextCursor: null,
      hasMore: false,
    };
  }

  const byId = new Map((hydrated.matches ?? []).map((m) => [m.id, m]));
  const matches: MeMatchItemDto[] = [];
  const viewerTeaserCtx = {
    datingChapter: gate.viewerDatingChapter,
    ageYears: gate.viewerAgeYears,
  };
  // Materialized `MatchListRank.matchScore` is list source of truth for score/tier
  // (hydrate may re-compare for explainability). Unscored ranks use -1.
  for (const rank of pageRanks) {
    const item = byId.get(rank.candidateProfileId);
    if (!item) continue;
    const matchScore =
      Number.isFinite(rank.matchScore) && rank.matchScore >= 0
        ? rank.matchScore
        : item.matchScore;
    matches.push(rebaseMeMatchListItemScore(item, matchScore, viewerTeaserCtx));
  }

  const lastRank = pageRanks[pageRanks.length - 1]!;
  const nextCursor = hasMore
    ? encodeMatchListCursor({
        b: lastRank.hardBlocked ? 1 : 0,
        s: lastRank.matchScore,
        id: lastRank.candidateProfileId,
      })
    : null;

  if (cursor == null) {
    const matchCount = await deps.matches.countRanksForViewer(userId);
    deps.analytics.track(userId, ProductAnalyticsEvents.MATCH_LIST_VIEWED, {
      matchCount,
      viewerProfileId: gate.viewerProfileId,
      source: 'materialized',
    });
  }

  recordMatchListLoadTimeMs(Date.now() - started);
  deps.obs.trace(
    `me matches list source=materialized profileId=${gate.viewerProfileId} pageSize=${matches.length} hasMore=${hasMore}`,
    ErrorCodes.ME_MATCHES_LIST_OK,
  );

  return toMeMatchesListReady({
    viewerProfileId: gate.viewerProfileId,
    viewerGender: gate.viewerGender,
    viewerAcceptedPartnerGenders: gate.viewerAcceptedPartnerGenders,
    viewerProfileAnalysisStale: gate.viewerProfileAnalysisStale,
    matches,
    nextCursor,
    hasMore,
  });
}
