import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/analytics.service';
import {
  MATCH_LIST_CACHE_TTL_SECONDS,
  MATCH_LIST_CACHE_VERSION,
  MATCH_LIST_LIST_EMPTY_ENQUEUE_TTL_SECONDS,
  matchListCacheKey,
  matchListListEmptyEnqueueKey,
  type MatchListCachePayload,
  type MatchListCursorPayload,
} from '../../cache/match-list-cache';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  recordCacheHit,
  recordCacheMiss,
  recordMatchListCacheSetMs,
} from '../../observability/custom-metrics';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
} from '../../workers/match-list-rank.ports';
import type {
  MeMatchItemDto,
  MeMatchesListResponseDto,
} from '../dto/me-matches-response.dto';
import { listFromMaterializedRanks } from './match-list-materialized';
import { MatchListQueryService } from './match-list-query.service';
import { MatchRankingService } from './match-ranking.service';

@Injectable()
export class MatchListCacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    private readonly cache: RedisCacheService,
    private readonly query: MatchListQueryService,
    private readonly ranking: MatchRankingService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
  ) {}

  async invalidateMatchListCache(userId: string): Promise<void> {
    await this.cache.del(matchListCacheKey(userId));
    await this.cache.del(matchListListEmptyEnqueueKey(userId));
  }

  async maybeEnqueueListEmpty(userId: string): Promise<void> {
    const acquired = await this.cache.setNx(
      matchListListEmptyEnqueueKey(userId),
      { at: new Date().toISOString() },
      MATCH_LIST_LIST_EMPTY_ENQUEUE_TTL_SECONDS,
    );
    if (!acquired) return;
    await this.matchListRankQueue.enqueueRebuild(userId, 'list_empty');
  }

  async getOrBuildRankedList(
    userId: string,
  ): Promise<MeMatchesListResponseDto> {
    const key = matchListCacheKey(userId);
    const cached = await this.cache.get<MatchListCachePayload<MeMatchItemDto>>(key);
    if (cached?.version === MATCH_LIST_CACHE_VERSION && Array.isArray(cached.matches)) {
      recordCacheHit();
      return {
        status: 'ready',
        ...(cached.statusMeta as Omit<
          Extract<MeMatchesListResponseDto, { status: 'ready' }>,
          'matches' | 'status' | 'nextCursor' | 'hasMore'
        >),
        matches: cached.matches,
      };
    }
    recordCacheMiss();
    const built = await this.ranking.buildFullRankedList(userId);
    if (built.status === 'ready' && built.matches) {
      const {
        matches,
        nextCursor: _n,
        hasMore: _h,
        status,
        ...statusMeta
      } = built;
      const cacheSetStarted = Date.now();
      await this.cache.set(
        key,
        {
          version: MATCH_LIST_CACHE_VERSION,
          builtAt: new Date().toISOString(),
          statusMeta: { status, ...statusMeta },
          matches,
        } satisfies MatchListCachePayload<MeMatchItemDto>,
        MATCH_LIST_CACHE_TTL_SECONDS,
      );
      recordMatchListCacheSetMs(Date.now() - cacheSetStarted);
    }
    return built;
  }

  /**
   * Sprint 31 Story 4 — flagged path: DB cursor on MatchListRank + page hydrate.
   * Never calls getOrBuildRankedList / buildFullRankedList for the full pool.
   */
  async listFromMaterializedRanks(
    userId: string,
    cursor: MatchListCursorPayload | null,
    limit: number,
    started: number,
  ): Promise<MeMatchesListResponseDto> {
    return listFromMaterializedRanks(
      {
        prisma: this.prisma,
        obs: this.obs,
        analytics: this.analytics,
        query: this.query,
        ranking: this.ranking,
        maybeEnqueueListEmpty: (id) => this.maybeEnqueueListEmpty(id),
      },
      userId,
      cursor,
      limit,
      started,
    );
  }
}
