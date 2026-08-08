import { Injectable } from '@nestjs/common';
import type {
  MatchListRankRebuildPort,
  MatchListRankRebuildResult,
} from '../workers/match-list-rank.ports';
import {
  decodeMatchListCursor,
  paginateRankedMatches,
} from '../cache/match-list-cache';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  recordMatchListLoadTimeMs,
  recordMatchListRankRebuildBudgetStop,
  recordMatchListRankRebuildMs,
} from '../observability/custom-metrics';
import { isMatchListMaterializedEnabled } from './match-list-materialized-flag';
import { resolveMatchListRebuildBudgetMs } from './match-list-rebuild-budget';
import { MatchListInvalidCursorError } from './me-matches.errors';
import type {
  MeMatchDetailDto,
  MeMatchesListResponseDto,
} from './dto/me-matches-response.dto';
import type { MeMatchesListQuery } from './dto/me-matches-list-query.dto';
import { MatchEligibilityService } from './matches/match-eligibility.service';
import { MatchRankingService } from './matches/match-ranking.service';
import { MatchListCacheService } from './matches/match-list-cache.service';
import { MatchDetailService } from './matches/match-detail.service';
import type { MatchListRankSnapshot } from './matches/match-list-rank.types';
export { matchListRankAfterCursorWhere } from './matches/match-list-cursor';
export type { MatchListRankSnapshot } from './matches/match-list-rank.types';

// ─── Response DTOs (Sprint 45 Story 3) ───────────────────────────────────────

export type {
  MeMatchItemDto,
  MeMatchDetailDto,
  MeMatchesListResponseDto,
} from './dto/me-matches-response.dto';

/**
 * Phase 3 Step 5 — product-facing matches endpoints for the authenticated user.
 * Thin facade over Query / Eligibility / Ranking / Cache / Detail (Sprint 38 Story 3).
 */
@Injectable()
export class MeMatchesService implements MatchListRankRebuildPort {
  constructor(
    private readonly obs: StructuredObservabilityService,
    private readonly eligibility: MatchEligibilityService,
    private readonly ranking: MatchRankingService,
    private readonly cacheSvc: MatchListCacheService,
    private readonly detail: MatchDetailService,
  ) {}

  /** Drop cached ranked match list for a viewer (LIKE/PASS/BLOCK, re-analysis, etc.). */
  async invalidateMatchListCache(userId: string): Promise<void> {
    return this.cacheSvc.invalidateMatchListCache(userId);
  }

  /**
   * Sprint 31 — thin ranked rows for MatchListRank (no list analytics).
   * Uses MATCH_LIST_REBUILD_CANDIDATE_CAP (≠ list miss cap).
   */
  async buildMatchListRankSnapshot(
    viewerUserId: string,
    options?: {
      deadlineAtMs?: number;
      now?: () => number;
    },
  ): Promise<MatchListRankSnapshot> {
    return this.ranking.buildMatchListRankSnapshot(viewerUserId, options);
  }

  /** Persist snapshot: upsert rows (chunked) then delete stale (or clear all when empty/not_ready). */
  async persistMatchListRankSnapshot(
    viewerUserId: string,
    snapshot: MatchListRankSnapshot,
  ): Promise<{ rowsWritten: number; rowsDeleted: number }> {
    return this.ranking.persistMatchListRankSnapshot(viewerUserId, snapshot);
  }

  /**
   * Snapshot → persist → invalidate Redis list cache.
   * Does not enqueue; called by MatchListRankQueueService via MATCH_LIST_RANK_REBUILD_PORT.
   * Sprint 39: on budget exceed, skip persist + invalidate (leave prior ranks).
   */
  async rebuildMatchListRanks(
    viewerUserId: string,
    reason?: string,
  ): Promise<MatchListRankRebuildResult> {
    const started = Date.now();
    const deadlineAtMs = started + resolveMatchListRebuildBudgetMs();
    const snapshot = await this.buildMatchListRankSnapshot(viewerUserId, {
      deadlineAtMs,
    });
    if (snapshot.status === 'budget_exceeded') {
      const rebuildMs = Date.now() - started;
      recordMatchListRankRebuildMs(rebuildMs);
      recordMatchListRankRebuildBudgetStop();
      this.obs.trace(
        `match list rank rebuild budget_exceeded viewerUserId=${viewerUserId} rebuildMs=${rebuildMs} reason=${reason ?? ''}`,
        ErrorCodes.ME_MATCHES_LIST_OK,
      );
      return {
        status: 'budget_exceeded',
        rowsWritten: 0,
        rowsDeleted: 0,
        rebuildMs,
      };
    }
    const persist = await this.persistMatchListRankSnapshot(
      viewerUserId,
      snapshot,
    );
    await this.invalidateMatchListCache(viewerUserId);
    const rebuildMs = Date.now() - started;
    recordMatchListRankRebuildMs(rebuildMs);
    this.obs.trace(
      `match list rank rebuild viewerUserId=${viewerUserId} status=${snapshot.status} rowsWritten=${persist.rowsWritten} rowsDeleted=${persist.rowsDeleted} rebuildMs=${rebuildMs} reason=${reason ?? ''}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );
    return {
      status: snapshot.status,
      reason: snapshot.reason,
      rowsWritten: persist.rowsWritten,
      rowsDeleted: persist.rowsDeleted,
      rebuildMs,
    };
  }

  async list(
    userId: string,
    query: MeMatchesListQuery = { limit: 20 },
  ): Promise<MeMatchesListResponseDto> {
    const started = Date.now();
    const limit =
      typeof query.limit === 'number' &&
      Number.isFinite(query.limit) &&
      query.limit >= 1
        ? Math.min(query.limit, 50)
        : 20;
    const cursor =
      query.cursor != null && query.cursor.trim() !== ''
        ? decodeMatchListCursor(query.cursor.trim())
        : null;
    if (query.cursor != null && query.cursor.trim() !== '' && cursor == null) {
      throw new MatchListInvalidCursorError();
    }

    if (isMatchListMaterializedEnabled()) {
      return this.cacheSvc.listFromMaterializedRanks(
        userId,
        cursor,
        limit,
        started,
      );
    }

    // Ranked list from cache or full build (legacy escape hatch)
    this.obs.trace(
      `me matches list source=legacy userId=${userId}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );
    const full = await this.cacheSvc.getOrBuildRankedList(userId);
    if (full.status !== 'ready' || !full.matches) {
      recordMatchListLoadTimeMs(Date.now() - started);
      return {
        ...full,
        nextCursor: null,
        hasMore: false,
      };
    }
    const { page, nextCursor, hasMore } = paginateRankedMatches(
      full.matches,
      cursor,
      limit,
    );
    recordMatchListLoadTimeMs(Date.now() - started);
    return {
      ...full,
      matches: page,
      nextCursor,
      hasMore,
    };
  }

  async getById(
    userId: string,
    candidateProfileId: string,
  ): Promise<MeMatchDetailDto> {
    return this.detail.getById(userId, candidateProfileId);
  }

  async getPrimaryPhotoFileById(
    userId: string,
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    return this.detail.getPrimaryPhotoFileById(
      userId,
      candidateProfileId,
      photoId,
    );
  }

  /**
   * Ensures the viewer can see the candidate on match detail/list rules.
   * Throws domain not-found / viewer-not-ready errors (same HTTP semantics as getById).
   */
  async assertMatchCandidateVisible(
    viewerUserId: string,
    candidateProfileId: string,
  ): Promise<{ candidateProfileId: string; targetUserId: string }> {
    return this.eligibility.assertMatchCandidateVisible(
      viewerUserId,
      candidateProfileId,
    );
  }
}
