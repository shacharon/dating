import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../logging/error-codes';
import { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import { buildMeMatchesParticipantReadModel } from '../../me-profile-engine.mapper';
import { MatchListViewerEvaluationMissingError } from '../../me-matches.errors';
import { countApprovedPhotosForProfile } from '../../me-profile-photo-gate';
import {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../../holy-grail-matching/dealbreaker-signals-text.extract';
import { buildProductProfileMatchingBridge } from '../../user-profile-matching-bridge.contract';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../../repositories/match.repository';
import { STATUS_ANALYZED, partnerGenderSourceForMeMatchesRow } from '../match-list.helpers';
import type {
  NormalizedBuildFullRankedListOptions,
  RankingCandidatePool,
  RankingLoadResult,
  RankingViewerReady,
} from './ranking.types';

@Injectable()
export class RankingLoadService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matches: IMatchQueryRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  async load(
    userId: string,
    options: NormalizedBuildFullRankedListOptions,
  ): Promise<RankingLoadResult> {
    const { emitListAnalytics, isPageHydrate, candidateCap } = options;
    const pageIds = options.candidateProfileIds;

    const viewer = await this.matches.findViewerMatchContextByUserId(userId);

    if (!viewer) {
      this.obs.trace(
        `me matches list: no profile for userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      return { kind: 'not_ready', dto: { status: 'not_ready', reason: 'no_profile' } };
    }

    if (viewer.status !== STATUS_ANALYZED) {
      this.obs.trace(
        `me matches list: profile not analyzed status=${viewer.status} userId=${userId}`,
        ErrorCodes.ME_MATCHES_LIST_NOT_READY,
      );
      return {
        kind: 'not_ready',
        dto: { status: 'not_ready', reason: 'not_analyzed' },
      };
    }

    const approvedPhotoCount = await countApprovedPhotosForProfile(
      this.matches,
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
          { surface: 'match_list' },
        );
      }
      return { kind: 'not_ready', dto: { status: 'not_ready', reason: 'no_photo' } };
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );

    const viewerEval = await this.matches.findLatestEvaluationForProfile(
      viewer.id,
    );
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
      { signals: viewerSignals, interests: viewerInterests },
    );
    if (viewerRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${viewer.id} reason=${viewerRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }

    const viewerTextFields = {
      aboutMe: viewerProfileCore.aboutMe,
      aboutPartner: viewerProfileCore.aboutPartner,
      aboutRelationship: viewerProfileCore.aboutRelationship,
    };
    const viewerReady: RankingViewerReady = {
      userId,
      viewer,
      viewerBridge,
      viewerRead,
      viewerEval,
      viewerProfileCore,
      viewerDealbreakerSignals:
        extractDealbreakerSignalsFromFreeText(viewerTextFields).signals,
      viewerSelfHints: extractSelfFactHintsFromFreeText(viewerTextFields),
      asOf,
    };

    if (isPageHydrate && pageIds!.length === 0) {
      return {
        kind: 'early_ready',
        dto: {
          status: 'ready',
          viewerProfileId: viewer.id,
          viewerGender: viewerBridge.selfGender,
          viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
            ? [...viewerBridge.acceptedPartnerGenders]
            : null,
          viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
          matches: [],
        },
      };
    }

    const pool = await this.loadCandidatePool(
      userId,
      viewerReady,
      options,
    );

    return { kind: 'loaded', viewer: viewerReady, pool };
  }

  private async loadCandidatePool(
    userId: string,
    viewerReady: RankingViewerReady,
    options: NormalizedBuildFullRankedListOptions,
  ): Promise<RankingCandidatePool> {
    const { viewer, viewerBridge, asOf } = viewerReady;
    const { isPageHydrate, candidateCap } = options;
    const pageIds = options.candidateProfileIds!;

    const candidateLoadStarted = Date.now();
    let candidateRows: RankingCandidatePool['candidateRows'];
    let totalAnalyzedCandidates = 0;
    let candidatesEligible = 0;
    let totalBeforeFilter = 0;
    let filteredNoPhotoCandidates = 0;

    if (isPageHydrate) {
      const loaded = await this.matches.findCandidateProfilesByIdsForList(
        pageIds,
      );
      const byId = new Map(loaded.map((r) => [r.id, r]));
      candidateRows = pageIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => r != null);
      totalBeforeFilter = candidateRows.length;
    } else {
      const listFilter = {
        viewerUserId: userId,
        acceptedPartnerGenders: viewerBridge.acceptedPartnerGenders,
        preference: viewer.preference ?? null,
        asOf,
      };
      const [totalAnalyzed, eligible, rows] = await Promise.all([
        this.matches.countAnalyzedCandidatesExcludingUser(userId),
        this.matches.countPhotoEligibleCandidates(listFilter),
        this.matches.listPhotoEligibleCandidates(listFilter, candidateCap),
      ]);
      totalAnalyzedCandidates = totalAnalyzed;
      candidatesEligible = eligible;
      candidateRows = rows;
      totalBeforeFilter = candidateRows.length;
      filteredNoPhotoCandidates = totalAnalyzedCandidates - candidatesEligible;
    }
    const candidateLoadMs = Date.now() - candidateLoadStarted;

    const evalQueryStarted = Date.now();
    const latestEvalByProfile =
      await this.matches.findLatestEvaluationsForProfileIds(
        candidateRows.map((r) => r.id),
      );
    const evalQueryMs = Date.now() - evalQueryStarted;

    const actionByTargetUserId = new Map(
      (
        await (isPageHydrate
          ? this.matches.listActionsByActorForTargets(
              userId,
              candidateRows.map((r) => r.userId),
            )
          : this.matches.listActionsByActor(userId))
      ).map((row) => [row.targetUserId, row.action]),
    );

    const mutualCounterpartUserIds = new Set(
      await this.matches.listActiveMutualCounterpartUserIds(userId),
    );

    return {
      isPageHydrate,
      candidateCap,
      totalAnalyzedCandidates,
      candidatesEligible,
      totalBeforeFilter,
      filteredNoPhotoCandidates,
      candidateLoadMs,
      candidateRows,
      latestEvalByProfile,
      actionByTargetUserId,
      mutualCounterpartUserIds,
      evalQueryMs,
      ...(isPageHydrate ? { hydratePageIdCount: pageIds.length } : {}),
    };
  }
}
