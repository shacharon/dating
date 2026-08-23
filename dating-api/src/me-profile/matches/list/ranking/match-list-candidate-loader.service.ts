import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../../logging/error-codes';
import { StructuredObservabilityService } from '../../../../logging/structured-observability.service';
import { buildMeMatchesParticipantReadModel } from '../../../profile/me-profile-engine.mapper';
import { buildProductProfileMatchingBridge } from '../../../contracts/user-profile-matching-bridge.contract';
import { countApprovedPhotosForProfile } from '../../../profile/me-profile-photo-gate';
import { MatchListViewerEvaluationMissingError } from '../../support/me-matches.errors';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../../../repositories/match.repository';
import {
  STATUS_ANALYZED,
  partnerGenderSourceForMeMatchesRow,
} from '../match-list.helpers';
import type {
  MatchListLoadOptions,
  MatchListLoaderResult,
  MatchListRankingContext,
} from './match-list-ranking.types';

@Injectable()
export class MatchListCandidateLoaderService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matchesRepository: IMatchQueryRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  async loadContext(
    userId: string,
    options: MatchListLoadOptions,
  ): Promise<MatchListLoaderResult> {
    const emitListAnalytics = options.emitListAnalytics;
    const pageIds = options.candidateProfileIds;
    const isPageHydrate = pageIds != null;
    const candidateCap = options.candidateCap;

    const viewer =
      await this.matchesRepository.findViewerMatchContextByUserId(userId);

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
      return { kind: 'not_ready', dto: { status: 'not_ready', reason: 'not_analyzed' } };
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
      return { kind: 'not_ready', dto: { status: 'not_ready', reason: 'no_photo' } };
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );

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
          kind: 'ready_early',
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
      const loaded =
        await this.matchesRepository.findCandidateProfilesByIdsForList(pageIds);
      const byId = new Map(loaded.map((r) => [r.id, r]));
      candidateRows = pageIds
        .map((id) => byId.get(id))
        .filter((r) => r != null);
      totalBeforeFilter = candidateRows.length;
    } else {
      const listFilter = {
        viewerUserId: userId,
        acceptedPartnerGenders: viewerBridge.acceptedPartnerGenders,
        preference: viewer.preference ?? null,
        asOf,
      };
      const [totalAnalyzed, eligible, rows] = await Promise.all([
        this.matchesRepository.countAnalyzedCandidatesExcludingUser(userId),
        this.matchesRepository.countPhotoEligibleCandidates(listFilter),
        this.matchesRepository.listPhotoEligibleCandidates(
          listFilter,
          candidateCap,
        ),
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

    const context: MatchListRankingContext = {
      userId,
      emitListAnalytics,
      isPageHydrate,
      pageIds,
      candidateCap,
      asOf,
      viewer,
      viewerBridge,
      viewerEval,
      viewerRead,
      viewerProfileCore,
      candidateRows,
      totalBeforeFilter,
      totalAnalyzedCandidates,
      candidatesEligible,
      filteredNoPhotoCandidates,
      candidateLoadMs,
      evalQueryMs,
      latestEvalByProfile,
      actionByTargetUserId,
      mutualCounterpartUserIds,
    };

    return { kind: 'ready', context };
  }
}
