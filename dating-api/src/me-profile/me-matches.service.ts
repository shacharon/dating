import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MatchActionType,
  MutualMatchStatus,
  Prisma,
  UserProfilePhotoStatus,
  type UserProfileStatus,
} from '@prisma/client';
import {
  latestEvaluationForProfile,
  latestEvaluationsForProfileIds,
} from './me-profile-analysis.service';
import { buildMeMatchesParticipantReadModel } from './me-profile-engine.mapper';
import { buildMatchCandidateSqlPrefilterWhere } from './me-matches-candidate-sql-prefilter';
import {
  MATCH_LIST_CANDIDATE_HYDRATE_ORDER_BY,
  resolveMatchListCandidateCap,
  resolveMatchListRebuildCandidateCap,
} from './match-list-candidate-cap';
import { resolveMatchListRebuildBudgetMs } from './match-list-rebuild-budget';
import {
  MATCH_LIST_RANK_PERSIST_CHUNK,
  MATCH_LIST_RANK_PERSIST_TX,
} from './match-list-rank-persist.constants';
import { toStoredMatchListScore } from './match-list-rank-score';
import { toPriorityFields } from './match-priority';
import { isMatchListMaterializedEnabled } from './match-list-materialized-flag';
import {
  buildProductProfileMatchingBridge,
  reciprocalProductGenderEligibility,
  type ProductProfilePartnerGenderPreferenceSource,
} from './user-profile-matching-bridge.contract';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import {
  MATCH_LIST_CACHE_TTL_SECONDS,
  MATCH_LIST_CACHE_VERSION,
  MATCH_LIST_LIST_EMPTY_ENQUEUE_TTL_SECONDS,
  decodeMatchListCursor,
  encodeMatchListCursor,
  matchListCacheKey,
  matchListListEmptyEnqueueKey,
  paginateRankedMatches,
  type MatchListCachePayload,
  type MatchListCursorPayload,
} from '../cache/match-list-cache';
import { RedisCacheService } from '../cache/redis-cache.service';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
  type MatchListRankRebuildPort,
  type MatchListRankRebuildResult,
} from '../workers/match-list-rank.ports';
import { ErrorCodes } from '../logging/error-codes';
import { getRequestLogFields } from '../logging/request-log-context';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  recordCacheHit,
  recordCacheMiss,
  recordMatchListCacheSetMs,
  recordMatchListCandidateLoadMs,
  recordMatchListCandidatesEligible,
  recordMatchListCandidatesLoaded,
  recordMatchListEvalQueryMs,
  recordMatchListLoadTimeMs,
  recordMatchListRankRebuildBudgetStop,
  recordMatchListRankRebuildMs,
  recordMatchListScoreCpuMs,
} from '../observability/custom-metrics';
import { resolveMatchPrimaryPhotoUrl } from '../photo-storage/cdn-url';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import { PrismaService } from '../prisma/prisma.service';
import type { MeMatchesListQuery } from './dto/me-matches-list-query.dto';
import { MutualMatchesService } from './mutual-matches.service';
import {
  candidateHasApprovedPhoto,
  countApprovedPhotosForProfile,
  viewerHasApprovedPhoto,
} from './me-profile-photo-gate';
import { evaluateHolyGrailPairDirections } from '../matches/holy-grail-pair-directions';
import {
  accumulateHolyGrailDimensionOutcomeCounts,
  emptyHolyGrailDimensionOutcomeCounts,
  formatHolyGrailDimensionOutcomeCountsForLog,
} from '../holy-grail-matching/eligibility.evaluator';
import {
  accumulateDealbreakerOutcomeCounts,
  countDealbreakerClassificationVolume,
  emptyDealbreakerTagOutcomeCounts,
  formatDealbreakerClassificationVolumeForLog,
  formatDealbreakerConfidenceForLog,
  formatDealbreakerOutcomeCountsForLog,
  formatKillSwitchTagsForLog,
} from '../holy-grail-matching/dealbreaker-telemetry';
import {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../holy-grail-matching/dealbreaker-signals-text.extract';
import { getCachedDealbreakerHardDisabledTags } from '../holy-grail-matching/dealbreaker-guardrails';
import {
  buildHardBlockReasons,
  isExistingHardBlockCandidate,
  toHardBlockedDto,
  type HardBlockedDto,
} from '../holy-grail-matching/hard-block-reasons';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';
import {
  buildMatchExplanationTraits,
  type MatchExplanationTrait,
} from '../matches/match-explanation-traits';
import {
  compareWithStatus,
  type MatchExplainabilityDto,
  type MatchRecommendationDto,
} from '../matches/match-engine';
import {
  MATCH_NARRATIVE_PROMPT_VERSION,
  MatchNarrativeCacheService,
  MatchNarrativeGenerator,
  buildMatchNarrativeFactPack,
} from '../matches/match-narrative';

const STATUS_ANALYZED = 'ANALYZED' as UserProfileStatus;

/** Prisma where for MatchListRank rows strictly after a list cursor. */
export function matchListRankAfterCursorWhere(
  viewerUserId: string,
  cursor: MatchListCursorPayload | null,
): Prisma.MatchListRankWhereInput {
  if (!cursor) {
    return { viewerUserId };
  }
  const hardBlocked = cursor.b === 1;
  const sameBucketLowerScore: Prisma.MatchListRankWhereInput = {
    hardBlocked,
    matchScore: { lt: cursor.s },
  };
  const sameBucketSameScore: Prisma.MatchListRankWhereInput = {
    hardBlocked,
    matchScore: cursor.s,
    candidateProfileId: { gt: cursor.id },
  };
  if (cursor.b === 0) {
    return {
      viewerUserId,
      OR: [
        { hardBlocked: true },
        sameBucketLowerScore,
        sameBucketSameScore,
      ],
    };
  }
  return {
    viewerUserId,
    OR: [sameBucketLowerScore, sameBucketSameScore],
  };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface MeMatchItemDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  /** Public display name chosen by the candidate; null when unset. */
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  /** True when at least one `UserProfileEvaluation` row exists for this candidate. */
  hasEvaluation: boolean;
  /** Engine final score (0–100). Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /**
   * Sprint 41 — same as `matchScore` when finite; null when unscored.
   * Presentation alias for triage UI (no algorithm change).
   */
  priorityScore: number | null;
  /** Sprint 41 — HIGH ≥85, GOOD ≥70, OTHER otherwise (incl. null score). */
  priorityTier: 'HIGH' | 'GOOD' | 'OTHER';
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** Viewer's action toward this candidate's user, if any. */
  yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  /**
   * Present when this candidate is hard-ineligible but “existing” for the viewer
   * (LIKE and/or ACTIVE MutualMatch). Absent for eligible matches.
   */
  hardBlocked?: HardBlockedDto;
}

/** Sprint 31 — thin rows for MatchListRank persistence (Story 2). */
export type MatchListRankSnapshot = {
  status: 'ready' | 'not_ready' | 'budget_exceeded';
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  rows: Array<{
    candidateProfileId: string;
    matchScore: number;
    hardBlocked: boolean;
  }>;
};

export interface MeMatchesListResponseDto {
  status: 'ready' | 'not_ready';
  /**
   * Present when `status = 'not_ready'`.
   * - `no_profile` — viewer has never created a product profile.
   * - `not_analyzed` — profile exists but has not completed analysis yet.
   * - `no_photo` — profile is analyzed but viewer has no approved photo.
   */
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  /** Present when `status = 'ready'`. */
  viewerProfileId?: string;
  viewerGender?: string | null;
  viewerAcceptedPartnerGenders?: string[] | null;
  /**
   * Present when `status = 'ready'`. True when the viewer's profile was saved after
   * their latest `UserProfileEvaluation` (`UserProfile.updatedAt > evaluation.createdAt`).
   */
  viewerProfileAnalysisStale?: boolean;
  /**
   * Photo-eligible analyzed candidates (≥1 APPROVED photo), before gender / HG / block filters.
   * Present when `status = 'ready'`.
   */
  totalCandidatesBeforeFilter?: number;
  /**
   * Analyzed candidates excluded because they have zero APPROVED photos.
   * Present when `status = 'ready'`.
   */
  filteredNoPhotoCandidates?: number;
  matches?: MeMatchItemDto[];
  /** Opaque cursor for the next page (ranked list). Null when no more pages. */
  nextCursor?: string | null;
  /** True when more ranked matches exist after this page. */
  hasMore?: boolean;
  /**
   * Sprint 39 — set when rebuild scoring hit MATCH_LIST_REBUILD_BUDGET_MS.
   * List GET paths do not set this.
   */
  budgetExceeded?: boolean;
}

export interface MeMatchDetailDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  /** Public display name chosen by the candidate; null when unset. */
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  /**
   * Curated analysis headline from the candidate’s read model (`evaluationDisplaySummary`).
   * Parsed only inside `me-profile-engine.mapper` from the latest stored evaluation blob.
   * Raw text fields (aboutMe / aboutPartner / aboutRelationship) are never exposed.
   */
  evaluationSummary: string | null;
  /** Engine final score (0–100). Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  /** Deterministic compatibility traits from `explainability.positiveChips` (detail only). */
  matchExplanationTraits?: MatchExplanationTrait[];
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /**
   * Sprint 22 — grounded long-form "why you match" narrative (detail only).
   * Omitted on compare guards / unscored pairs. List DTO never includes this.
   */
  matchNarrative?: string;
  /**
   * Present when this candidate is hard-ineligible but “existing” for the viewer
   * (LIKE and/or ACTIVE MutualMatch). Absent for eligible matches.
   */
  hardBlocked?: HardBlockedDto;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Phase 3 Step 5 — product-facing matches endpoints for the authenticated user.
 *
 * **Active path (new product flow):**
 * - Viewer identity is resolved from the session `userId` only — never from client path/body.
 * - Source of truth is `UserProfile` + `UserProfileEvaluation`, with partner gender
 *   preferences read from `UserProfilePreference.acceptedPartnerGenders` when that row exists.
 * - Match-engine + HG inputs are composed **only** via {@link buildMeMatchesParticipantReadModel}
 *   (semantic scoring payload from the latest stored evaluation — not `UserProfile.interestsTop` / `sig*`).
 *   Do not call low-level mapper entry points or read stored evaluation blobs in this service;
 *   policy tests enforce that.
 * - Legacy `MatchmakingProfile` is NOT used on this path.
 * - Gender filtering is reciprocal: both viewer→candidate AND candidate→viewer must pass.
 */
@Injectable()
export class MeMatchesService implements MatchListRankRebuildPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    private readonly mutualMatches: MutualMatchesService,
    private readonly analytics: AnalyticsService,
    private readonly cache: RedisCacheService,
    private readonly matchNarrativeGenerator: MatchNarrativeGenerator,
    private readonly matchNarrativeCache: MatchNarrativeCacheService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
  ) {}

  /** Drop cached ranked match list for a viewer (LIKE/PASS/BLOCK, re-analysis, etc.). */
  async invalidateMatchListCache(userId: string): Promise<void> {
    await this.cache.del(matchListCacheKey(userId));
    await this.cache.del(matchListListEmptyEnqueueKey(userId));
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
    const dto = await this.buildFullRankedList(viewerUserId, {
      candidateCap: resolveMatchListRebuildCandidateCap(),
      emitListAnalytics: false,
      deadlineAtMs: options?.deadlineAtMs,
      now: options?.now,
    });
    if (dto.budgetExceeded) {
      return {
        status: 'budget_exceeded',
        rows: [],
      };
    }
    if (dto.status !== 'ready') {
      return {
        status: 'not_ready',
        reason: dto.reason,
        rows: [],
      };
    }
    return {
      status: 'ready',
      rows: (dto.matches ?? []).map((m) => ({
        candidateProfileId: m.id,
        matchScore: toStoredMatchListScore(m.matchScore),
        hardBlocked: Boolean(m.hardBlocked),
      })),
    };
  }

  /** Persist snapshot: upsert rows (chunked) then delete stale (or clear all when empty/not_ready). */
  async persistMatchListRankSnapshot(
    viewerUserId: string,
    snapshot: MatchListRankSnapshot,
  ): Promise<{ rowsWritten: number; rowsDeleted: number }> {
    // Sprint 39 — never wipe ranks on a budget abort (caller should skip persist).
    if (snapshot.status === 'budget_exceeded') {
      return { rowsWritten: 0, rowsDeleted: 0 };
    }
    if (snapshot.status === 'not_ready' || snapshot.rows.length === 0) {
      const del = await this.prisma.matchListRank.deleteMany({
        where: { viewerUserId },
      });
      return { rowsWritten: 0, rowsDeleted: del.count };
    }

    const builtAt = new Date();
    const ids = snapshot.rows.map((r) => r.candidateProfileId);

    // Sprint 40 — upsert-before-delete in short chunked txns (not one unbounded txn).
    for (let i = 0; i < snapshot.rows.length; i += MATCH_LIST_RANK_PERSIST_CHUNK) {
      const chunk = snapshot.rows.slice(i, i + MATCH_LIST_RANK_PERSIST_CHUNK);
      await this.prisma.$transaction(async (tx) => {
        await Promise.all(
          chunk.map((row) =>
            tx.matchListRank.upsert({
              where: {
                viewerUserId_candidateProfileId: {
                  viewerUserId,
                  candidateProfileId: row.candidateProfileId,
                },
              },
              create: {
                viewerUserId,
                candidateProfileId: row.candidateProfileId,
                matchScore: row.matchScore,
                hardBlocked: row.hardBlocked,
                builtAt,
              },
              update: {
                matchScore: row.matchScore,
                hardBlocked: row.hardBlocked,
                builtAt,
              },
            }),
          ),
        );
      }, MATCH_LIST_RANK_PERSIST_TX);
    }

    const del = await this.prisma.matchListRank.deleteMany({
      where: {
        viewerUserId,
        candidateProfileId: { notIn: ids },
      },
    });

    return { rowsWritten: snapshot.rows.length, rowsDeleted: del.count };
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

  // ─── Candidate selects ─────────────────────────────────────────────────────
  // `UserProfile.interestsTop` and `sig*` are excluded — engine/HG inputs come only from
  // `buildMeMatchesParticipantReadModel` (latest evaluation + optional normalized rows).
  // List omits about* free-text (and unused city/country/status/user); detail keeps them.
  // Hard-block list UX batch-loads about* only for the existing hard-fail subset.

  /** Slim select for match-list rebuild (`buildFullRankedList`). */
  private candidateSelectList = {
    id: true,
    userId: true,
    name: true,
    nickname: true,
    birthDate: true,
    gender: true,
    desiredPartnerGenders: true,
    locationLabel: true,
    analyzedAt: true,
    updatedAt: true,
    childrenStatus: true,
    wantsChildren: true,
    smokingFrequency: true,
    alcoholUse: true,
    education: true,
    religion: true,
    preference: true,
    signals: {
      select: { signalKey: true, signalValue: true, evalVersion: true },
    },
    interests: {
      select: { tag: true, rank: true, evalVersion: true },
      orderBy: { rank: 'asc' as const },
    },
    photos: {
      where: { status: 'APPROVED' as const },
      select: { id: true, isPrimary: true, storageKey: true },
    },
    _count: { select: { evaluations: true } },
  } as const;

  /** Full select for getById / assertMatchCandidateVisible (includes about*). */
  private candidateSelectDetail = {
    id: true,
    userId: true,
    name: true,
    nickname: true,
    status: true,
    birthDate: true,
    gender: true,
    desiredPartnerGenders: true,
    city: true,
    country: true,
    locationLabel: true,
    aboutMe: true,
    aboutPartner: true,
    aboutRelationship: true,
    analyzedAt: true,
    updatedAt: true,
    childrenStatus: true,
    wantsChildren: true,
    smokingFrequency: true,
    alcoholUse: true,
    education: true,
    religion: true,
    preference: true,
    signals: {
      select: { signalKey: true, signalValue: true, evalVersion: true },
    },
    interests: {
      select: { tag: true, rank: true, evalVersion: true },
      orderBy: { rank: 'asc' as const },
    },
    photos: {
      where: { status: 'APPROVED' as const },
      select: { id: true, isPrimary: true, storageKey: true },
    },
    _count: { select: { evaluations: true } },
    user: { select: { deletedAt: true } },
  } as const;

  // ─── list ──────────────────────────────────────────────────────────────────

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
      throw new BadRequestException({
        error: 'invalid_cursor',
        message: 'Invalid match list cursor.',
      });
    }

    if (isMatchListMaterializedEnabled()) {
      return this.listFromMaterializedRanks(userId, cursor, limit, started);
    }

    // Ranked list from cache or full build (legacy escape hatch)
    this.obs.trace(
      `me matches list source=legacy userId=${userId}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );
    const full = await this.getOrBuildRankedList(userId);
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

  /**
   * Sprint 31 Story 4 — flagged path: DB cursor on MatchListRank + page hydrate.
   * Never calls getOrBuildRankedList / buildFullRankedList for the full pool.
   */
  private async listFromMaterializedRanks(
    userId: string,
    cursor: MatchListCursorPayload | null,
    limit: number,
    started: number,
  ): Promise<MeMatchesListResponseDto> {
    const gate = await this.resolveViewerListGate(userId);
    if (gate.status === 'not_ready') {
      recordMatchListLoadTimeMs(Date.now() - started);
      return {
        status: 'not_ready',
        reason: gate.reason,
        nextCursor: null,
        hasMore: false,
      };
    }

    const rankRows = await this.fetchMatchListRankPage(userId, cursor, limit + 1);
    if (rankRows.length === 0) {
      if (cursor == null) {
        await this.maybeEnqueueListEmpty(userId);
      }
      recordMatchListLoadTimeMs(Date.now() - started);
      return {
        status: 'ready',
        viewerProfileId: gate.viewerProfileId,
        viewerGender: gate.viewerGender,
        viewerAcceptedPartnerGenders: gate.viewerAcceptedPartnerGenders,
        viewerProfileAnalysisStale: gate.viewerProfileAnalysisStale,
        matches: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const hasMore = rankRows.length > limit;
    const pageRanks = hasMore ? rankRows.slice(0, limit) : rankRows;
    const pageIds = pageRanks.map((r) => r.candidateProfileId);

    const hydrated = await this.buildFullRankedList(userId, {
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
    for (const id of pageIds) {
      const item = byId.get(id);
      if (item) matches.push(item);
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
      const matchCount = await this.prisma.matchListRank.count({
        where: { viewerUserId: userId },
      });
      this.analytics.track(userId, ProductAnalyticsEvents.MATCH_LIST_VIEWED, {
        matchCount,
        viewerProfileId: gate.viewerProfileId,
        source: 'materialized',
      });
    }

    recordMatchListLoadTimeMs(Date.now() - started);
    this.obs.trace(
      `me matches list source=materialized profileId=${gate.viewerProfileId} pageSize=${matches.length} hasMore=${hasMore}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );

    return {
      status: 'ready',
      viewerProfileId: gate.viewerProfileId,
      viewerGender: gate.viewerGender,
      viewerAcceptedPartnerGenders: gate.viewerAcceptedPartnerGenders,
      viewerProfileAnalysisStale: gate.viewerProfileAnalysisStale,
      matches,
      nextCursor,
      hasMore,
    };
  }

  private async resolveViewerListGate(userId: string): Promise<
    | { status: 'not_ready'; reason: 'no_profile' | 'not_analyzed' | 'no_photo' }
    | {
        status: 'ready';
        viewerProfileId: string;
        viewerGender: string | null;
        viewerAcceptedPartnerGenders: string[] | null;
        viewerProfileAnalysisStale: boolean;
      }
  > {
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
    if (!viewer) {
      this.obs.trace(
        `me matches list: no profile for userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      return { status: 'not_ready', reason: 'no_profile' };
    }
    if (viewer.status !== STATUS_ANALYZED) {
      this.obs.trace(
        `me matches list: profile not analyzed status=${viewer.status} userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      return { status: 'not_ready', reason: 'not_analyzed' };
    }
    const approvedPhotoCount = await countApprovedPhotosForProfile(
      this.prisma,
      viewer.id,
    );
    if (approvedPhotoCount < 1) {
      this.obs.trace(
        `me matches list: no approved photo profileId=${viewer.id} userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      this.analytics.track(
        userId,
        ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED,
        { surface: 'match_list' },
      );
      return { status: 'not_ready', reason: 'no_photo' };
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );
    const viewerEval = await latestEvaluationForProfile(this.prisma, viewer.id);
    if (!viewerEval) {
      throw new InternalServerErrorException({
        error: 'viewer_evaluation_not_found',
        message:
          'Profile is marked analyzed but no UserProfileEvaluation row exists. Re-run analysis.',
      });
    }

    return {
      status: 'ready',
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
    };
  }

  private async fetchMatchListRankPage(
    viewerUserId: string,
    cursor: MatchListCursorPayload | null,
    take: number,
  ): Promise<
    Array<{
      candidateProfileId: string;
      matchScore: number;
      hardBlocked: boolean;
    }>
  > {
    return this.prisma.matchListRank.findMany({
      where: matchListRankAfterCursorWhere(viewerUserId, cursor),
      orderBy: [
        { hardBlocked: 'asc' },
        { matchScore: 'desc' },
        { candidateProfileId: 'asc' },
      ],
      take,
      select: {
        candidateProfileId: true,
        matchScore: true,
        hardBlocked: true,
      },
    });
  }

  private async maybeEnqueueListEmpty(userId: string): Promise<void> {
    const acquired = await this.cache.setNx(
      matchListListEmptyEnqueueKey(userId),
      { at: new Date().toISOString() },
      MATCH_LIST_LIST_EMPTY_ENQUEUE_TTL_SECONDS,
    );
    if (!acquired) return;
    await this.matchListRankQueue.enqueueRebuild(userId, 'list_empty');
  }

  private async getOrBuildRankedList(
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
    const built = await this.buildFullRankedList(userId);
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

  /** Full ranked match list (cache miss path). */
  private async buildFullRankedList(
    userId: string,
    options?: {
      candidateCap?: number;
      /** When false, skip MATCH_LIST_VIEWED / photo-gate analytics (materialization). Default true. */
      emitListAnalytics?: boolean;
      /**
       * When set, hydrate only these profile IDs (materialized page).
       * Preserves input order; skips pool cap / pool meta counts.
       */
      candidateProfileIds?: string[];
      /** Sprint 39 — wall deadline for rebuild scoring; list paths omit this. */
      deadlineAtMs?: number;
      now?: () => number;
    },
  ): Promise<MeMatchesListResponseDto> {
    const emitListAnalytics = options?.emitListAnalytics !== false;
    const pageIds = options?.candidateProfileIds;
    const isPageHydrate = pageIds != null;
    const candidateCap =
      options?.candidateCap ?? resolveMatchListCandidateCap();
    const nowFn = options?.now ?? Date.now;
    const deadlineAtMs = options?.deadlineAtMs;
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        preference: true,
        signals: {
          select: { signalKey: true, signalValue: true, evalVersion: true },
        },
        interests: {
          select: { tag: true, rank: true, evalVersion: true },
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!viewer) {
      this.obs.trace(
        `me matches list: no profile for userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      return { status: 'not_ready', reason: 'no_profile' };
    }

    if (viewer.status !== STATUS_ANALYZED) {
      this.obs.trace(
        `me matches list: profile not analyzed status=${viewer.status} userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      return { status: 'not_ready', reason: 'not_analyzed' };
    }

    const approvedPhotoCount = await countApprovedPhotosForProfile(
      this.prisma,
      viewer.id,
    );
    if (approvedPhotoCount < 1) {
      this.obs.trace(
        `me matches list: no approved photo profileId=${viewer.id} userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      if (emitListAnalytics) {
        this.analytics.track(
          userId,
          ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED,
          {
            surface: 'match_list',
          },
        );
      }
      return { status: 'not_ready', reason: 'no_photo' };
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );

    // Latest evaluation only (ORDER BY createdAt DESC LIMIT 1) — required for scoring.
    const viewerEval = await latestEvaluationForProfile(this.prisma, viewer.id);
    if (!viewerEval) {
      throw new InternalServerErrorException({
        error: 'viewer_evaluation_not_found',
        message:
          'Profile is marked analyzed but no UserProfileEvaluation row exists. Re-run analysis.',
      });
    }
    const {
      preference: viewerPreference,
      signals: viewerSignals = [],
      interests: viewerInterests = [],
      ...viewerProfileCore
    } = viewer;
    const viewerRead = buildMeMatchesParticipantReadModel(
      viewerProfileCore,
      viewerPreference ?? null,
      viewerEval,
      {
        signals: viewerSignals,
        interests: viewerInterests,
      },
    );
    if (viewerRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${viewer.id} reason=${viewerRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }

    const candidateLoadStarted = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candidateRows: any[];
    let totalAnalyzedCandidates = 0;
    let candidatesEligible = 0;
    let totalBeforeFilter = 0;
    let filteredNoPhotoCandidates = 0;

    if (isPageHydrate) {
      if (pageIds.length === 0) {
        return {
          status: 'ready',
          viewerProfileId: viewer.id,
          viewerGender: viewerBridge.selfGender,
          viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
            ? [...viewerBridge.acceptedPartnerGenders]
            : null,
          viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
          matches: [],
        };
      }
      const loaded = await this.prisma.userProfile.findMany({
        where: {
          id: { in: pageIds },
          status: STATUS_ANALYZED,
        },
        select: this.candidateSelectList,
      });
      const byId = new Map(loaded.map((r) => [r.id, r]));
      candidateRows = pageIds
        .map((id) => byId.get(id))
        .filter((r) => r != null);
      totalBeforeFilter = candidateRows.length;
    } else {
      // Temporary hydrate cap until async match materialization (list: MATCH_LIST_CANDIDATE_CAP;
      // rebuild snapshot may override via options.candidateCap).
      const listCandidateWhere = this.matchCandidatePhotoEligibleWhere(userId, {
        acceptedPartnerGenders: viewerBridge.acceptedPartnerGenders,
        preference: viewer.preference ?? null,
        asOf,
      });
      const [totalAnalyzed, eligible, rows] = await Promise.all([
        this.prisma.userProfile.count({
          where: this.matchCandidateBaseWhere(userId),
        }),
        this.prisma.userProfile.count({
          where: listCandidateWhere,
        }),
        this.prisma.userProfile.findMany({
          // Viewer→cand gender/age may be SQL-prefiltered; reciprocal gender still
          // evaluated in memory via reciprocalProductGenderEligibility below.
          where: listCandidateWhere,
          orderBy: MATCH_LIST_CANDIDATE_HYDRATE_ORDER_BY,
          take: candidateCap,
          select: this.candidateSelectList,
        }),
      ]);
      totalAnalyzedCandidates = totalAnalyzed;
      candidatesEligible = eligible;
      candidateRows = rows;
      totalBeforeFilter = candidateRows.length;
      // Cap must not inflate this: use uncapped eligible count, not hydrated length.
      filteredNoPhotoCandidates = totalAnalyzedCandidates - candidatesEligible;
    }
    const candidateLoadMs = Date.now() - candidateLoadStarted;

    const evalQueryStarted = Date.now();
    const latestEvalByProfile = await latestEvaluationsForProfileIds(
      this.prisma,
      candidateRows.map((r) => r.id),
    );
    const evalQueryMs = Date.now() - evalQueryStarted;

    const actionByTargetUserId = new Map(
      (
        await this.prisma.matchAction.findMany({
          where: isPageHydrate
            ? {
                actorUserId: userId,
                targetUserId: {
                  in: candidateRows.map((r) => r.userId as string),
                },
              }
            : { actorUserId: userId },
          select: { targetUserId: true, action: true },
        })
      ).map((row) => [row.targetUserId, row.action]),
    );

    const mutualCounterpartUserIds = new Set<string>();
    for (const m of await this.prisma.mutualMatch.findMany({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      select: { userId1: true, userId2: true },
    })) {
      mutualCounterpartUserIds.add(
        m.userId1 === userId ? m.userId2 : m.userId1,
      );
    }

    const scoreCpuStarted = Date.now();
    const matches: MeMatchItemDto[] = [];
    const hgDimensionOutcomeCounts = emptyHolyGrailDimensionOutcomeCounts();
    const dealbreakerOutcomeCounts = emptyDealbreakerTagOutcomeCounts();
    const viewerTextFields = {
      aboutMe: viewerProfileCore.aboutMe,
      aboutPartner: viewerProfileCore.aboutPartner,
      aboutRelationship: viewerProfileCore.aboutRelationship,
    };
    const viewerDealbreakerSignals =
      extractDealbreakerSignalsFromFreeText(viewerTextFields).signals;
    const viewerSelfHints =
      extractSelfFactHintsFromFreeText(viewerTextFields);

    type PendingHardBlockMatch = {
      row: (typeof candidateRows)[number];
      candidateEval: NonNullable<
        ReturnType<typeof latestEvalByProfile.get>
      >;
      candidateBridge: ReturnType<typeof buildProductProfileMatchingBridge>;
      hgDirections: NonNullable<
        ReturnType<typeof evaluateHolyGrailPairDirections>
      >;
      matchScore: number | null;
      explainability: MatchExplainabilityDto | null;
      recommendation: MatchRecommendationDto | null;
    };
    const pendingHardBlocks: PendingHardBlockMatch[] = [];
    let budgetExceeded = false;

    for (const row of candidateRows) {
      if (deadlineAtMs != null && nowFn() >= deadlineAtMs) {
        budgetExceeded = true;
        break;
      }
      const candidateBridge = buildProductProfileMatchingBridge(
        {
          ...row,
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
          city: null,
          country: null,
        },
        asOf,
        partnerGenderSourceForMeMatchesRow(row, this.obs),
      );
      const eligible = reciprocalProductGenderEligibility(
        viewerBridge.acceptedPartnerGenders,
        viewerBridge.selfGender,
        candidateBridge.acceptedPartnerGenders,
        candidateBridge.selfGender,
      );

      if (!eligible) continue;

      const candidateEval = latestEvalByProfile.get(row.id);
      if (!candidateEval) {
        throw new InternalServerErrorException({
          error: 'candidate_evaluation_not_found',
          message: `Profile ${row.id} is analyzed but has no UserProfileEvaluation row.`,
        });
      }

      const {
        preference: candidatePreference,
        signals: candidateSignals = [],
        interests: candidateInterests = [],
        ...candidateProfileCore
      } = row;
      const candidateRead = buildMeMatchesParticipantReadModel(
        {
          ...candidateProfileCore,
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
        },
        candidatePreference ?? null,
        candidateEval,
        {
          signals: candidateSignals,
          interests: candidateInterests,
        },
      );
      if (candidateRead.hg.fallback) {
        this.obs.trace(
          `event=hg_preference_fallback_used profileId=${row.id} reason=${candidateRead.hg.fallback.reason}`,
          ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
        );
      }

      // HG Layer-3 hard-eligibility gate: exclude only when both rows carry structured
      // HG data AND either direction is an explicit FAIL. Missing HG data → PASS (lenient).
      const hgDirections = evaluateHolyGrailPairDirections(
        viewerRead.hg.row,
        candidateRead.hg.row,
      );
      if (hgDirections !== null) {
        accumulateHolyGrailDimensionOutcomeCounts(
          hgDimensionOutcomeCounts,
          hgDirections.aToB,
        );
        accumulateHolyGrailDimensionOutcomeCounts(
          hgDimensionOutcomeCounts,
          hgDirections.bToA,
        );
        accumulateDealbreakerOutcomeCounts(
          dealbreakerOutcomeCounts,
          hgDirections.aToB,
        );
        accumulateDealbreakerOutcomeCounts(
          dealbreakerOutcomeCounts,
          hgDirections.bToA,
        );
      }

      const isHgHardFail =
        hgDirections !== null &&
        (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
          hgDirections.bToA.overallHardEligibility === 'FAIL');

      if (isHgHardFail) {
        const yourAction = matchActionToYourAction(
          actionByTargetUserId.get(row.userId) ?? null,
        );
        if (
          !isExistingHardBlockCandidate({
            yourAction,
            hasActiveMutual: mutualCounterpartUserIds.has(row.userId),
          })
        ) {
          continue;
        }
        // Defer hardBlocked DTO until about* batch fetch (list select omits free-text).
        if (actionByTargetUserId.get(row.userId) === MatchActionType.BLOCK) {
          continue;
        }
        let matchScore: number | null = null;
        let explainability: MatchExplainabilityDto | null = null;
        let recommendation: MatchRecommendationDto | null = null;
        const result = compareWithStatus(
          viewerRead.enginePayload,
          candidateRead.enginePayload,
        );
        if (!('status' in result)) {
          matchScore = result.finalScore;
          explainability = result.explainability;
          recommendation = result.recommendation;
        }
        pendingHardBlocks.push({
          row,
          candidateEval,
          candidateBridge,
          hgDirections: hgDirections!,
          matchScore,
          explainability,
          recommendation,
        });
        continue;
      }

      if (actionByTargetUserId.get(row.userId) === MatchActionType.BLOCK) {
        continue;
      }

      let matchScore: number | null = null;
      let explainability: MatchExplainabilityDto | null = null;
      let recommendation: MatchRecommendationDto | null = null;
      const approvedPhotos = row.photos ?? [];

      const result = compareWithStatus(
        viewerRead.enginePayload,
        candidateRead.enginePayload,
      );
      if (!('status' in result)) {
        matchScore = result.finalScore;
        explainability = result.explainability;
        recommendation = result.recommendation;
      }

      const primaryPhotoId = pickApprovedPrimaryPhotoId(approvedPhotos);
      const primaryStorageKey =
        approvedPhotos.find((p) => p.id === primaryPhotoId)?.storageKey ?? null;

      matches.push({
        id: row.id,
        nickname: row.nickname?.trim() ? row.nickname.trim() : null,
        gender: candidateBridge.selfGender,
        ageYears: candidateBridge.derivedSelfAgeYears,
        locationLabel: candidateBridge.location.locationLabel,
        analyzedAt: row.analyzedAt?.toISOString() ?? null,
        hasEvaluation: row._count.evaluations > 0,
        matchScore,
        ...toPriorityFields(matchScore),
        profileAnalysisStale: row.updatedAt > candidateEval.createdAt,
        primaryPhotoUrl: resolveMatchPrimaryPhotoUrl({
          profileId: row.id,
          photoId: primaryPhotoId,
          storageKey: primaryStorageKey,
        }),
        approvedPhotoCount: approvedPhotos.length,
        explainability,
        recommendation,
        yourAction: matchActionToYourAction(
          actionByTargetUserId.get(row.userId) ?? null,
        ),
      });
    }

    if (pendingHardBlocks.length > 0) {
      const aboutRows = await this.prisma.userProfile.findMany({
        where: { id: { in: pendingHardBlocks.map((p) => p.row.id) } },
        select: {
          id: true,
          aboutMe: true,
          aboutPartner: true,
          aboutRelationship: true,
        },
      });
      const aboutById = new Map(aboutRows.map((r) => [r.id, r]));
      for (const pending of pendingHardBlocks) {
        const about = aboutById.get(pending.row.id);
        const hardBlocked = this.buildHardBlockedDto(
          pending.hgDirections,
          viewerDealbreakerSignals,
          viewerSelfHints,
          {
            aboutMe: about?.aboutMe ?? null,
            aboutPartner: about?.aboutPartner ?? null,
            aboutRelationship: about?.aboutRelationship ?? null,
          },
        );
        if (hardBlocked === undefined) {
          continue;
        }
        const approvedPhotos = pending.row.photos ?? [];
        const primaryPhotoId = pickApprovedPrimaryPhotoId(approvedPhotos);
        const primaryStorageKey =
          approvedPhotos.find((p) => p.id === primaryPhotoId)?.storageKey ??
          null;
        matches.push({
          id: pending.row.id,
          nickname: pending.row.nickname?.trim()
            ? pending.row.nickname.trim()
            : null,
          gender: pending.candidateBridge.selfGender,
          ageYears: pending.candidateBridge.derivedSelfAgeYears,
          locationLabel: pending.candidateBridge.location.locationLabel,
          analyzedAt: pending.row.analyzedAt?.toISOString() ?? null,
          hasEvaluation: pending.row._count.evaluations > 0,
          matchScore: pending.matchScore,
          ...toPriorityFields(pending.matchScore),
          profileAnalysisStale:
            pending.row.updatedAt > pending.candidateEval.createdAt,
          primaryPhotoUrl: resolveMatchPrimaryPhotoUrl({
            profileId: pending.row.id,
            photoId: primaryPhotoId,
            storageKey: primaryStorageKey,
          }),
          approvedPhotoCount: approvedPhotos.length,
          explainability: pending.explainability,
          recommendation: pending.recommendation,
          yourAction: matchActionToYourAction(
            actionByTargetUserId.get(pending.row.userId) ?? null,
          ),
          hardBlocked,
        });
      }
    }

    // Eligible first (score DESC); hard-blocked existing append at bottom (score DESC within).
    // Page hydrate keeps membership order from MatchListRank (caller reorders again if needed).
    if (!isPageHydrate) {
      matches.sort((a, b) => {
        const aBlocked = a.hardBlocked ? 1 : 0;
        const bBlocked = b.hardBlocked ? 1 : 0;
        if (aBlocked !== bBlocked) return aBlocked - bBlocked;
        const aScore = a.matchScore ?? -1;
        const bScore = b.matchScore ?? -1;
        if (bScore !== aScore) return bScore - aScore;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }
    const scoreCpuMs = Date.now() - scoreCpuStarted;

    if (!isPageHydrate) {
      recordMatchListCandidatesLoaded(candidateRows.length);
      recordMatchListCandidatesEligible(candidatesEligible);
    }
    recordMatchListCandidateLoadMs(candidateLoadMs);
    recordMatchListEvalQueryMs(evalQueryMs);
    recordMatchListScoreCpuMs(scoreCpuMs);

    this.obs.trace(
      isPageHydrate
        ? `me matches page hydrate profileId=${viewer.id} pageIds=${pageIds.length} after=${matches.length} candidateLoadMs=${candidateLoadMs} evalQueryMs=${evalQueryMs} scoreCpuMs=${scoreCpuMs}`
        : `me matches list profileId=${viewer.id} before=${totalBeforeFilter} after=${matches.length} filteredNoPhoto=${filteredNoPhotoCandidates} candidatesHydrated=${candidateRows.length} candidatesEligible=${candidatesEligible} cap=${candidateCap} candidateLoadMs=${candidateLoadMs} evalQueryMs=${evalQueryMs} scoreCpuMs=${scoreCpuMs}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );

    this.obs.trace(
      `event=hg_dimension_outcomes profileId=${viewer.id} ${formatHolyGrailDimensionOutcomeCountsForLog(hgDimensionOutcomeCounts)}`,
      ErrorCodes.ME_MATCHES_HG_DIMENSION_OUTCOMES,
    );

    const dealbreakerClassVol = countDealbreakerClassificationVolume(
      viewerDealbreakerSignals,
    );
    this.obs.trace(
      `event=hg_dealbreaker_outcomes profileId=${viewer.id} ${formatDealbreakerOutcomeCountsForLog(dealbreakerOutcomeCounts)} ${formatDealbreakerClassificationVolumeForLog(dealbreakerClassVol)} ${formatDealbreakerConfidenceForLog(viewerDealbreakerSignals)} ${formatKillSwitchTagsForLog(getCachedDealbreakerHardDisabledTags())}`,
      ErrorCodes.ME_MATCHES_HG_DEALBREAKER_OUTCOMES,
    );

    if (emitListAnalytics) {
      this.analytics.track(userId, ProductAnalyticsEvents.MATCH_LIST_VIEWED, {
        matchCount: matches.length,
        viewerProfileId: viewer.id,
      });
    }

    return {
      status: 'ready',
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
      ...(isPageHydrate
        ? {}
        : {
            totalCandidatesBeforeFilter: totalBeforeFilter,
            filteredNoPhotoCandidates,
          }),
      matches,
      ...(budgetExceeded ? { budgetExceeded: true } : {}),
    };
  }

  // ─── assertMatchCandidateVisible ───────────────────────────────────────────

  /**
   * Ensures the viewer can see the candidate on match detail/list rules.
   * Throws `NotFoundException` when not visible (same semantics as getById).
   */
  async assertMatchCandidateVisible(
    viewerUserId: string,
    candidateProfileId: string,
  ): Promise<{ candidateProfileId: string; targetUserId: string }> {
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId: viewerUserId },
      include: {
        preference: true,
        signals: {
          select: { signalKey: true, signalValue: true, evalVersion: true },
        },
        interests: {
          select: { tag: true, rank: true, evalVersion: true },
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new NotFoundException(
        'Your profile is not ready for matching. Complete your profile and run analysis first.',
      );
    }

    if (!(await viewerHasApprovedPhoto(this.prisma, viewer.id))) {
      throw new NotFoundException(
        'Your profile is not ready for matching. Add at least one photo first.',
      );
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );

    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: this.candidateSelectDetail,
    });

    if (
      !candidate ||
      candidate.status !== STATUS_ANALYZED ||
      candidate.user?.deletedAt != null
    ) {
      throw new NotFoundException('Match not found.');
    }

    this.assertCandidateHasApprovedPhotosInRow(candidate);

    const candidateBridge = buildProductProfileMatchingBridge(
      candidate,
      asOf,
      partnerGenderSourceForMeMatchesRow(candidate, this.obs),
    );
    const eligible = reciprocalProductGenderEligibility(
      viewerBridge.acceptedPartnerGenders,
      viewerBridge.selfGender,
      candidateBridge.acceptedPartnerGenders,
      candidateBridge.selfGender,
    );

    if (!eligible) {
      throw new NotFoundException('Match not found.');
    }

    const viewerEval = await latestEvaluationForProfile(this.prisma, viewer.id);
    const candidateEval = await latestEvaluationForProfile(
      this.prisma,
      candidate.id,
    );
    if (!viewerEval || !candidateEval) {
      throw new NotFoundException({
        error: 'evaluation_not_found',
        message: 'No analysis result available for this match.',
      });
    }

    await this.assertViewerHasNotBlockedTarget(viewerUserId, candidate.userId);

    return {
      candidateProfileId: candidate.id,
      targetUserId: candidate.userId,
    };
  }

  // ─── getById ───────────────────────────────────────────────────────────────

  async getById(
    userId: string,
    candidateProfileId: string,
  ): Promise<MeMatchDetailDto> {
    // Viewer must have an analyzed profile to retrieve match details.
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        preference: true,
        signals: {
          select: { signalKey: true, signalValue: true, evalVersion: true },
        },
        interests: {
          select: { tag: true, rank: true, evalVersion: true },
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new NotFoundException(
        'Your profile is not ready for matching. Complete your profile and run analysis first.',
      );
    }

    if (!(await viewerHasApprovedPhoto(this.prisma, viewer.id))) {
      throw new NotFoundException(
        'Your profile is not ready for matching. Add at least one photo first.',
      );
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );

    // Load candidate by UserProfile.id — never by userId (no foreign-key exposure).
    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: this.candidateSelectDetail,
    });

    if (
      !candidate ||
      candidate.status !== STATUS_ANALYZED ||
      candidate.user?.deletedAt != null
    ) {
      throw new NotFoundException('Match not found.');
    }

    this.assertCandidateHasApprovedPhotosInRow(candidate);

    const candidateBridge = buildProductProfileMatchingBridge(
      candidate,
      asOf,
      partnerGenderSourceForMeMatchesRow(candidate, this.obs),
    );
    const eligible = reciprocalProductGenderEligibility(
      viewerBridge.acceptedPartnerGenders,
      viewerBridge.selfGender,
      candidateBridge.acceptedPartnerGenders,
      candidateBridge.selfGender,
    );

    // Return 404 even when the profile exists but is not eligible — do not leak existence.
    if (!eligible) {
      throw new NotFoundException('Match not found.');
    }

    const viewerEval = await latestEvaluationForProfile(this.prisma, viewer.id);
    const candidateEval = await latestEvaluationForProfile(
      this.prisma,
      candidate.id,
    );
    if (!viewerEval || !candidateEval) {
      throw new NotFoundException({
        error: 'evaluation_not_found',
        message: 'No analysis result available for this match.',
      });
    }

    await this.assertViewerHasNotBlockedTarget(userId, candidate.userId);

    const {
      preference: viewerPrefDetail,
      signals: viewerSignalsDetail = [],
      interests: viewerInterestsDetail = [],
      ...viewerCoreDetail
    } = viewer;
    const viewerRead = buildMeMatchesParticipantReadModel(
      viewerCoreDetail,
      viewerPrefDetail ?? null,
      viewerEval,
      {
        signals: viewerSignalsDetail,
        interests: viewerInterestsDetail,
      },
    );
    const {
      preference: candidatePrefDetail,
      signals: candidateSignalsDetail = [],
      interests: candidateInterestsDetail = [],
      ...candidateCoreDetail
    } = candidate;
    const candidateRead = buildMeMatchesParticipantReadModel(
      candidateCoreDetail,
      candidatePrefDetail ?? null,
      candidateEval,
      {
        signals: candidateSignalsDetail,
        interests: candidateInterestsDetail,
      },
    );

    if (viewerRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${viewer.id} reason=${viewerRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }
    if (candidateRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${candidate.id} reason=${candidateRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }

    // HG Layer-3 hard-eligibility gate (same policy as list).
    const hgDirections = evaluateHolyGrailPairDirections(
      viewerRead.hg.row,
      candidateRead.hg.row,
    );

    let hardBlocked: HardBlockedDto | undefined;
    if (
      hgDirections !== null &&
      (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
        hgDirections.bToA.overallHardEligibility === 'FAIL')
    ) {
      const [actionRow, mutual] = await Promise.all([
        this.prisma.matchAction.findUnique({
          where: {
            actorUserId_targetUserId: {
              actorUserId: userId,
              targetUserId: candidate.userId,
            },
          },
          select: { action: true },
        }),
        this.mutualMatches.findActiveByUserPair(userId, candidate.userId),
      ]);
      const yourAction = matchActionToYourAction(actionRow?.action ?? null);
      if (
        !isExistingHardBlockCandidate({
          yourAction,
          hasActiveMutual: mutual != null,
        })
      ) {
        throw new NotFoundException('Match not found.');
      }
      const viewerTextFields = {
        aboutMe: viewerCoreDetail.aboutMe,
        aboutPartner: viewerCoreDetail.aboutPartner,
        aboutRelationship: viewerCoreDetail.aboutRelationship,
      };
      hardBlocked = this.buildHardBlockedDto(
        hgDirections,
        extractDealbreakerSignalsFromFreeText(viewerTextFields).signals,
        extractSelfFactHintsFromFreeText(viewerTextFields),
        {
          aboutMe: candidateCoreDetail.aboutMe,
          aboutPartner: candidateCoreDetail.aboutPartner,
          aboutRelationship: candidateCoreDetail.aboutRelationship,
        },
      );
      if (hardBlocked === undefined) {
        throw new NotFoundException('Match not found.');
      }
    }

    const evaluationSummary = candidateRead.evaluationDisplaySummary;

    let matchScore: number | null = null;
    let explainability: MatchExplainabilityDto | null = null;
    let recommendation: MatchRecommendationDto | null = null;

    const result = compareWithStatus(
      viewerRead.enginePayload,
      candidateRead.enginePayload,
    );
    let matchExplanationTraits: MatchExplanationTrait[] | undefined;
    let matchNarrative: string | undefined;
    if (!('status' in result)) {
      matchScore = result.finalScore;
      explainability = result.explainability;
      recommendation = result.recommendation;
      const built = buildMatchExplanationTraits(
        result.explainability.positiveChips,
        result.finalScore,
      );
      matchExplanationTraits = built.length > 0 ? built : undefined;
      matchNarrative = await this.resolveMatchNarrative({
        viewerProfileId: viewer.id,
        candidateProfileId: candidate.id,
        viewerEvaluationId: viewerEval.id,
        candidateEvaluationId: candidateEval.id,
        finalScore: result.finalScore,
        explainability: result.explainability,
        recommendation: result.recommendation,
        traits: matchExplanationTraits,
        viewerAbout: {
          aboutMe: viewerCoreDetail.aboutMe,
          aboutPartner: viewerCoreDetail.aboutPartner,
          aboutRelationship: viewerCoreDetail.aboutRelationship,
        },
        candidateAbout: {
          aboutMe: candidateCoreDetail.aboutMe,
          aboutPartner: candidateCoreDetail.aboutPartner,
          aboutRelationship: candidateCoreDetail.aboutRelationship,
        },
      });
    }

    this.obs.trace(
      `me matches detail viewerProfileId=${viewer.id} candidateProfileId=${candidate.id}`,
      ErrorCodes.ME_MATCHES_DETAIL_OK,
    );

    return {
      id: candidate.id,
      nickname: candidate.nickname?.trim() ? candidate.nickname.trim() : null,
      gender: candidateBridge.selfGender,
      ageYears: candidateBridge.derivedSelfAgeYears,
      locationLabel: candidateBridge.location.locationLabel,
      analyzedAt: candidate.analyzedAt?.toISOString() ?? null,
      hasEvaluation: candidate._count.evaluations > 0,
      evaluationSummary,
      matchScore,
      profileAnalysisStale: candidate.updatedAt > candidateEval.createdAt,
      ...(matchExplanationTraits !== undefined && {
        matchExplanationTraits,
      }),
      primaryPhotoUrl: (() => {
        const photos = candidate.photos ?? [];
        const photoId = pickApprovedPrimaryPhotoId(photos);
        const storageKey =
          photos.find((p) => p.id === photoId)?.storageKey ?? null;
        return resolveMatchPrimaryPhotoUrl({
          profileId: candidate.id,
          photoId,
          storageKey,
        });
      })(),
      approvedPhotoCount: (candidate.photos ?? []).length,
      explainability,
      recommendation,
      ...(matchNarrative !== undefined ? { matchNarrative } : {}),
      ...(hardBlocked !== undefined ? { hardBlocked } : {}),
    };
  }

  /**
   * Lazy evaluation-keyed narrative: cache hit → return; miss → LLM (cache only llm source).
   * Fallback narratives are never persisted.
   */
  private async resolveMatchNarrative(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    finalScore: number;
    explainability: MatchExplainabilityDto;
    recommendation: MatchRecommendationDto;
    traits?: MatchExplanationTrait[];
    viewerAbout?: {
      aboutMe?: string | null;
      aboutPartner?: string | null;
      aboutRelationship?: string | null;
    };
    candidateAbout?: {
      aboutMe?: string | null;
      aboutPartner?: string | null;
      aboutRelationship?: string | null;
    };
  }): Promise<string> {
    const promptVersion = MATCH_NARRATIVE_PROMPT_VERSION;
    const cacheKey = {
      viewerProfileId: args.viewerProfileId,
      candidateProfileId: args.candidateProfileId,
      viewerEvaluationId: args.viewerEvaluationId,
      candidateEvaluationId: args.candidateEvaluationId,
      promptVersion,
    };

    try {
      const cached = await this.matchNarrativeCache.find(cacheKey);
      if (cached != null && cached.length > 0) {
        this.obs.trace(
          `me matches narrative cache hit viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
          ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_HIT,
        );
        return cached;
      }
    } catch {
      // treat as miss
    }

    this.obs.trace(
      `me matches narrative cache miss viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
      ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_MISS,
    );

    const requestId = getRequestLogFields()?.requestId ?? randomUUID();
    const factPack = buildMatchNarrativeFactPack({
      finalScore: args.finalScore,
      explainability: args.explainability,
      recommendation: {
        caution: args.recommendation.caution,
        suggestedNextAction: args.recommendation.suggestedNextAction,
      },
      traits: args.traits,
      viewerAbout: args.viewerAbout,
      candidateAbout: args.candidateAbout,
    });

    const generated = await this.matchNarrativeGenerator.generate(factPack, {
      requestId,
    });

    if (generated.source === 'llm') {
      this.obs.trace(
        `me matches narrative llm ok viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion} source=llm`,
        ErrorCodes.ME_MATCHES_NARRATIVE_LLM_OK,
      );
      try {
        await this.matchNarrativeCache.upsert({
          ...cacheKey,
          narrative: generated.narrative,
        });
        this.obs.trace(
          `me matches narrative cache store ok viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
          ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_STORE_OK,
        );
      } catch {
        this.obs.trace(
          `me matches narrative cache store fail viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
          ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_STORE_FAIL,
        );
      }
    } else {
      this.obs.trace(
        `me matches narrative fallback viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion} source=fallback`,
        ErrorCodes.ME_MATCHES_NARRATIVE_FALLBACK,
      );
    }

    return generated.narrative;
  }

  async getPrimaryPhotoFileById(
    userId: string,
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: {
        id: true,
        userId: true,
        status: true,
        birthDate: true,
        gender: true,
        desiredPartnerGenders: true,
        city: true,
        country: true,
        locationLabel: true,
        aboutMe: true,
        aboutPartner: true,
        aboutRelationship: true,
        preference: true,
        user: { select: { deletedAt: true } },
      },
    });
    if (!candidate || candidate.user?.deletedAt != null) {
      throw new NotFoundException('Match not found.');
    }

    const mutual = await this.mutualMatches.findActiveByUserPair(
      userId,
      candidate.userId,
    );
    if (mutual) {
      return this.readApprovedPrimaryPhotoFile(candidateProfileId, photoId);
    }

    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new NotFoundException('Match not found.');
    }

    if (!(await viewerHasApprovedPhoto(this.prisma, viewer.id))) {
      throw new NotFoundException('Match not found.');
    }

    if (candidate.status !== STATUS_ANALYZED) {
      throw new NotFoundException('Match not found.');
    }

    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      new Date(),
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );
    const candidateBridge = buildProductProfileMatchingBridge(
      candidate,
      new Date(),
      partnerGenderSourceForMeMatchesRow(candidate, this.obs),
    );
    const eligible = reciprocalProductGenderEligibility(
      viewerBridge.acceptedPartnerGenders,
      viewerBridge.selfGender,
      candidateBridge.acceptedPartnerGenders,
      candidateBridge.selfGender,
    );
    if (!eligible) {
      throw new NotFoundException('Match not found.');
    }

    if (!(await candidateHasApprovedPhoto(this.prisma, candidate.id))) {
      throw new NotFoundException('Match not found.');
    }

    await this.assertViewerHasNotBlockedTarget(userId, candidate.userId);

    return this.readApprovedPrimaryPhotoFile(candidateProfileId, photoId);
  }

  private matchCandidateBaseWhere(viewerUserId: string) {
    return {
      userId: { not: viewerUserId },
      status: STATUS_ANALYZED,
      user: { deletedAt: null },
    };
  }

  private matchCandidatePhotoEligibleWhere(
    viewerUserId: string,
    sqlPrefilter?: {
      acceptedPartnerGenders: ReturnType<
        typeof buildProductProfileMatchingBridge
      >['acceptedPartnerGenders'];
      preference: {
        partnerAgeMin: number | null;
        partnerAgeMax: number | null;
        maxDistanceKm: number | null;
        acceptedPartnerGenders: readonly string[];
      } | null;
      asOf: Date;
    },
  ) {
    const prefilterWhere =
      sqlPrefilter !== undefined
        ? buildMatchCandidateSqlPrefilterWhere(sqlPrefilter)
        : {};
    return {
      ...this.matchCandidateBaseWhere(viewerUserId),
      photos: { some: { status: UserProfilePhotoStatus.APPROVED } },
      ...prefilterWhere,
    };
  }

  private assertCandidateHasApprovedPhotosInRow(candidate: {
    photos?: ReadonlyArray<unknown>;
  }): void {
    if ((candidate.photos ?? []).length < 1) {
      throw new NotFoundException('Match not found.');
    }
  }

  private async readApprovedPrimaryPhotoFile(
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const photo = await this.prisma.userProfilePhoto.findFirst({
      where: {
        id: photoId,
        profileId: candidateProfileId,
        status: 'APPROVED',
        isPrimary: true,
      },
      select: { mimeType: true, storageKey: true },
    });
    if (!photo) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this match.',
      });
    }
    const content = await this.photoStorage.read(photo.storageKey);
    if (!content) {
      throw new NotFoundException({
        error: 'photo_file_not_found',
        message: 'Photo file is missing from storage.',
      });
    }
    return { contentType: photo.mimeType, content };
  }

  private async assertViewerHasNotBlockedTarget(
    viewerUserId: string,
    targetUserId: string,
  ): Promise<void> {
    const row = await this.prisma.matchAction.findUnique({
      where: {
        actorUserId_targetUserId: { actorUserId: viewerUserId, targetUserId },
      },
      select: { action: true },
    });
    if (row?.action === MatchActionType.BLOCK) {
      throw new NotFoundException('Match not found.');
    }
  }

  private buildHardBlockedDto(
    hgDirections: {
      aToB: HolyGrailDirectionalEvaluationResult;
      bToA: HolyGrailDirectionalEvaluationResult;
    },
    viewerSignals: ReturnType<
      typeof extractDealbreakerSignalsFromFreeText
    >['signals'],
    viewerSelfHints: ReturnType<typeof extractSelfFactHintsFromFreeText>,
    candidateText: {
      aboutMe?: string | null;
      aboutPartner?: string | null;
      aboutRelationship?: string | null;
    },
  ): HardBlockedDto | undefined {
    const counterpartySignals =
      extractDealbreakerSignalsFromFreeText(candidateText).signals;
    const counterpartySelfHints =
      extractSelfFactHintsFromFreeText(candidateText);
    return toHardBlockedDto(
      buildHardBlockReasons({
        aToB: hgDirections.aToB,
        bToA: hgDirections.bToA,
        viewerSignals,
        counterpartySignals,
        viewerSelfHints,
        counterpartySelfHints,
      }),
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchActionToYourAction(
  action: MatchActionType | null | undefined,
): 'LIKE' | 'PASS' | 'BLOCK' | null {
  if (action === MatchActionType.LIKE) return 'LIKE';
  if (action === MatchActionType.PASS) return 'PASS';
  if (action === MatchActionType.BLOCK) return 'BLOCK';
  return null;
}

/**
 * Partner-gender read path for `/api/v1/me/matches` only: prefer `UserProfilePreference.acceptedPartnerGenders`
 * when the joined row exists; otherwise emit a trace and fall back to `UserProfile.desiredPartnerGenders` JSON
 * inside {@link buildProductProfileMatchingBridge}.
 */
function partnerGenderSourceForMeMatchesRow(
  row: { id: string; preference?: { acceptedPartnerGenders: string[] } | null },
  obs: StructuredObservabilityService,
): ProductProfilePartnerGenderPreferenceSource | undefined {
  if (row.preference != null) {
    return {
      kind: 'preference',
      acceptedPartnerGenders: row.preference.acceptedPartnerGenders,
    };
  }
  obs.trace(
    `event=me_matches_partner_genders_legacy_json profileId=${row.id} reason=missing_UserProfilePreference_row_reads_UserProfile_desiredPartnerGenders`,
    ErrorCodes.ME_MATCHES_PARTNER_GENDER_LEGACY_JSON,
  );
  return undefined;
}

function pickApprovedPrimaryPhotoId(
  photos: ReadonlyArray<{ id: string; isPrimary: boolean }>,
): string | null {
  const primary = photos.find((p) => p.isPrimary);
  return primary?.id ?? null;
}
