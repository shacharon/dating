import { Injectable } from '@nestjs/common';
import { MutualMatchStatus } from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  recordMatchListCandidateLoadMs,
  recordMatchListCandidatesEligible,
  recordMatchListCandidatesLoaded,
  recordMatchListEvalQueryMs,
  recordMatchListScoreCpuMs,
} from '../../observability/custom-metrics';
import { resolveMatchPrimaryPhotoUrl } from '../../photo-storage/cdn-url';
import { PrismaService } from '../../prisma/prisma.service';
import {
  latestEvaluationForProfile,
  latestEvaluationsForProfileIds,
} from '../me-profile-analysis.service';
import { buildMeMatchesParticipantReadModel } from '../me-profile-engine.mapper';
import {
  MATCH_LIST_CANDIDATE_HYDRATE_ORDER_BY,
  resolveMatchListCandidateCap,
  resolveMatchListRebuildCandidateCap,
} from '../match-list-candidate-cap';
import {
  MATCH_LIST_RANK_PERSIST_CHUNK,
  MATCH_LIST_RANK_PERSIST_TX,
} from '../match-list-rank-persist.constants';
import { toStoredMatchListScore } from '../match-list-rank-score';
import {
  MatchListCandidateEvaluationMissingError,
  MatchListViewerEvaluationMissingError,
} from '../me-matches.errors';
import {
  toMeMatchListItem,
  toMeMatchesListReady,
} from '../me-matches-response.mapper';
import type {
  MeMatchItemDto,
  MeMatchesListResponseDto,
} from '../dto/me-matches-response.dto';
import { buildProductProfileMatchingBridge } from '../user-profile-matching-bridge.contract';
import { countApprovedPhotosForProfile } from '../me-profile-photo-gate';
import { evaluateHolyGrailPairDirections } from '../../matches/holy-grail-pair-directions';
import {
  accumulateHolyGrailDimensionOutcomeCounts,
  emptyHolyGrailDimensionOutcomeCounts,
  formatHolyGrailDimensionOutcomeCountsForLog,
} from '../../holy-grail-matching/eligibility.evaluator';
import {
  accumulateDealbreakerOutcomeCounts,
  countDealbreakerClassificationVolume,
  emptyDealbreakerTagOutcomeCounts,
  formatDealbreakerClassificationVolumeForLog,
  formatDealbreakerConfidenceForLog,
  formatDealbreakerOutcomeCountsForLog,
  formatKillSwitchTagsForLog,
} from '../../holy-grail-matching/dealbreaker-telemetry';
import {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../holy-grail-matching/dealbreaker-signals-text.extract';
import { getCachedDealbreakerHardDisabledTags } from '../../holy-grail-matching/dealbreaker-guardrails';
import {
  compareWithStatus,
  type MatchExplainabilityDto,
  type MatchRecommendationDto,
} from '../../matches/match-engine';
import { MatchEligibilityService } from './match-eligibility.service';
import { MatchListQueryService } from './match-list-query.service';
import {
  appendPendingHardBlockMatches,
  type PendingHardBlockMatch,
} from './match-list-hard-block-pending';
import {
  STATUS_ANALYZED,
  matchActionToYourAction,
  partnerGenderSourceForMeMatchesRow,
  pickApprovedPrimaryPhotoId,
} from './match-list.helpers';
import type { MatchListRankSnapshot } from './match-list-rank.types';

@Injectable()
export class MatchRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    private readonly query: MatchListQueryService,
    private readonly eligibility: MatchEligibilityService,
  ) {}

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

  /** Full ranked match list (cache miss path) + materialized page hydrate. */
  async buildFullRankedList(
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
      throw new MatchListViewerEvaluationMissingError();
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
        select: this.query.candidateSelectList,
      });
      const byId = new Map(loaded.map((r) => [r.id, r]));
      candidateRows = pageIds
        .map((id) => byId.get(id))
        .filter((r) => r != null);
      totalBeforeFilter = candidateRows.length;
    } else {
      // Temporary hydrate cap until async match materialization (list: MATCH_LIST_CANDIDATE_CAP;
      // rebuild snapshot may override via options.candidateCap).
      const listCandidateWhere = this.query.matchCandidatePhotoEligibleWhere(userId, {
        acceptedPartnerGenders: viewerBridge.acceptedPartnerGenders,
        preference: viewer.preference ?? null,
        asOf,
      });
      const [totalAnalyzed, eligible, rows] = await Promise.all([
        this.prisma.userProfile.count({
          where: this.query.matchCandidateBaseWhere(userId),
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
          select: this.query.candidateSelectList,
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
      const eligible = this.eligibility.passesReciprocalGender(
        viewerBridge.acceptedPartnerGenders,
        viewerBridge.selfGender,
        candidateBridge.acceptedPartnerGenders,
        candidateBridge.selfGender,
      );

      if (!eligible) continue;

      const candidateEval = latestEvalByProfile.get(row.id);
      if (!candidateEval) {
        throw new MatchListCandidateEvaluationMissingError(row.id);
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

      const isHgHardFail = this.eligibility.isHgPairHardFail(hgDirections);

      if (isHgHardFail) {
        const yourAction = matchActionToYourAction(
          actionByTargetUserId.get(row.userId) ?? null,
        );
        if (
          !this.eligibility.shouldAdmitHgHardFailOnList({
            yourAction,
            hasActiveMutual: mutualCounterpartUserIds.has(row.userId),
            rawAction: actionByTargetUserId.get(row.userId) ?? null,
          })
        ) {
          continue;
        }
        // Defer hardBlocked DTO until about* batch fetch (list select omits free-text).
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
          candidatePayload: candidateRead.enginePayload,
        });
        continue;
      }

      if (this.eligibility.isBlockedAction(actionByTargetUserId.get(row.userId))) {
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

      matches.push(
        toMeMatchListItem({
          id: row.id,
          nickname: row.nickname ?? null,
          gender: candidateBridge.selfGender,
          ageYears: candidateBridge.derivedSelfAgeYears,
          locationLabel: candidateBridge.location.locationLabel,
          analyzedAt: row.analyzedAt ?? null,
          hasEvaluation: row._count.evaluations > 0,
          profileAnalysisStale: row.updatedAt > candidateEval.createdAt,
          primaryPhotoUrl: resolveMatchPrimaryPhotoUrl({
            profileId: row.id,
            photoId: primaryPhotoId,
            storageKey: primaryStorageKey,
          }),
          approvedPhotoCount: approvedPhotos.length,
          yourAction: matchActionToYourAction(
            actionByTargetUserId.get(row.userId) ?? null,
          ),
          score: {
            matchScore,
            explainability,
            recommendation,
          },
          teaser: {
            datingChapter: viewer.datingChapter,
            viewerAgeYears: viewerBridge.derivedSelfAgeYears,
            viewerPayload: viewerRead.enginePayload,
            candidatePayload: candidateRead.enginePayload,
          },
        }),
      );
    }

    await appendPendingHardBlockMatches({
      prisma: this.prisma,
      pendingHardBlocks,
      matches,
      viewerDealbreakerSignals,
      viewerSelfHints,
      buildHardBlockedDto: (hg, signals, hints, text) =>
        this.eligibility.buildHardBlockedDto(hg, signals, hints, text),
      actionByTargetUserId,
      viewerDatingChapter: viewer.datingChapter,
      viewerAgeYears: viewerBridge.derivedSelfAgeYears,
      viewerEnginePayload: viewerRead.enginePayload,
    });

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

    return toMeMatchesListReady({
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
    });
  }
}
