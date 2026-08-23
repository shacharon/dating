import { Inject, Injectable } from '@nestjs/common';
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
import { buildMeMatchesParticipantReadModel } from '../me-profile-engine.mapper';
import {
  resolveMatchListCandidateCap,
  resolveMatchListRebuildCandidateCap,
} from '../match-list-candidate-cap';
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
  PAIR_MATCH_POLICY,
  type PairMatchPolicy,
} from '../../matching-policy/pair-match-policy';
import { MatchEligibilityService } from './match-eligibility.service';
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
import { toPresentationJson } from './match-list-rank-presentation.types';
import {
  hydrateMatchListPageFromRanks,
  type MatchListPageHydrateGate,
  type MatchListPageHydrateResult,
} from './match-list-page-hydrate';
import {
  MATCH_QUERY_REPOSITORY,
  MATCH_RANK_REPOSITORY,
  type IMatchQueryRepository,
  type IMatchRankRepository,
} from '../repositories/match.repository';
import type { RankPageRow } from '../repositories/match.repository.types';

@Injectable()
export class MatchRankingService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matchesRepository: IMatchQueryRepository,
    @Inject(MATCH_RANK_REPOSITORY)
    private readonly ranks: IMatchRankRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    private readonly eligibility: MatchEligibilityService,
    @Inject(PAIR_MATCH_POLICY) private readonly pairMatchPolicy: PairMatchPolicy,
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
        presentationJson: toPresentationJson({
          explainability: m.explainability,
          recommendation: m.recommendation,
          hardBlocked: m.hardBlocked,
        }),
      })),
    };
  }

  async hydrateMatchListPageFromRanks(
    userId: string,
    pageRanks: RankPageRow[],
    gate: MatchListPageHydrateGate,
  ): Promise<MatchListPageHydrateResult> {
    return hydrateMatchListPageFromRanks(
      {
        matches: this.matchesRepository,
        obs: this.obs,
      },
      userId,
      pageRanks,
      gate,
    );
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
      const rowsDeleted =
        await this.ranks.deleteAllRanksForViewer(viewerUserId);
      return { rowsWritten: 0, rowsDeleted };
    }
    return this.ranks.replaceRankSnapshot(
      viewerUserId,
      snapshot.rows,
      new Date(),
    );
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
    const viewer =
      await this.matchesRepository.findViewerMatchContextByUserId(userId);

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
      this.matchesRepository,
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
    const viewerEval =
      await this.matchesRepository.findLatestEvaluationForProfile(viewer.id);
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
      const loaded =
        await this.matchesRepository.findCandidateProfilesByIdsForList(pageIds);
      const byId = new Map(loaded.map((r) => [r.id, r]));
      candidateRows = pageIds
        .map((id) => byId.get(id))
        .filter((r) => r != null);
      totalBeforeFilter = candidateRows.length;
    } else {
      // Temporary hydrate cap until async match materialization (list: MATCH_LIST_CANDIDATE_CAP;
      // rebuild snapshot may override via options.candidateCap).
      const listFilter = {
        viewerUserId: userId,
        acceptedPartnerGenders: viewerBridge.acceptedPartnerGenders,
        preference: viewer.preference ?? null,
        asOf,
      };
      const [totalAnalyzed, eligible, rows] = await Promise.all([
        this.matchesRepository.countAnalyzedCandidatesExcludingUser(userId),
        this.matchesRepository.countPhotoEligibleCandidates(listFilter),
        // Viewer→cand gender/age may be SQL-prefiltered; reciprocal gender still
        // evaluated in memory via reciprocalProductGenderEligibility below.
        this.matchesRepository.listPhotoEligibleCandidates(
          listFilter,
          candidateCap,
        ),
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
    const latestEvalByProfile =
      await this.matchesRepository.findLatestEvaluationsForProfileIds(
      candidateRows.map((r) => r.id),
    );
    const evalQueryMs = Date.now() - evalQueryStarted;

    const actionByTargetUserId = new Map(
      (
        await (isPageHydrate
          ? this.matchesRepository.listActionsByActorForTargets(
              userId,
              candidateRows.map((r) => r.userId as string),
            )
          : this.matchesRepository.listActionsByActor(userId))
      ).map((row) => [row.targetUserId, row.action]),
    );

    const mutualCounterpartUserIds = new Set(
      await this.matchesRepository.listActiveMutualCounterpartUserIds(userId),
    );

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

      // HG gate + legacy rank via PairMatchPolicy (admit/omit stays on eligibility).
      const evaluated = this.pairMatchPolicy.evaluate({
        viewerHgRow: viewerRead.hg.row,
        candidateHgRow: candidateRead.hg.row,
        viewerEnginePayload: viewerRead.enginePayload,
        candidateEnginePayload: candidateRead.enginePayload,
      });
      const hgDirections = evaluated.gate.hgDirections;
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

      if (evaluated.gate.isHardFail) {
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
        const { matchScore, explainability, recommendation } = evaluated.score;
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

      const { matchScore, explainability, recommendation } = evaluated.score;
      const approvedPhotos = row.photos ?? [];

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
      matchesRepository: this.matchesRepository,
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
