import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import type { MatchListCursorPayload } from '../../cache/match-list-cache';
import type { RankPageRow } from '../repositories/match.repository.types';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { MatchListViewerEvaluationMissingError } from '../me-matches.errors';
import { countApprovedPhotosForProfile } from '../me-profile-photo-gate';
import { buildProductProfileMatchingBridge } from '../user-profile-matching-bridge.contract';
import {
  MATCH_QUERY_REPOSITORY,
  MATCH_RANK_REPOSITORY,
  type IMatchQueryRepository,
  type IMatchRankRepository,
} from '../repositories/match.repository';
import {
  STATUS_ANALYZED,
  partnerGenderSourceForMeMatchesRow,
} from './match-list.helpers';

@Injectable()
export class MatchListQueryService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matches: IMatchQueryRepository,
    @Inject(MATCH_RANK_REPOSITORY)
    private readonly ranks: IMatchRankRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  async resolveViewerListGate(userId: string): Promise<
    | { status: 'not_ready'; reason: 'no_profile' | 'not_analyzed' | 'no_photo' }
    | {
        status: 'ready';
        viewerProfileId: string;
        viewerGender: string | null;
        viewerAcceptedPartnerGenders: string[] | null;
        viewerProfileAnalysisStale: boolean;
        viewerDatingChapter: string | null;
        viewerAgeYears: number | null;
      }
  > {
    const viewer = await this.matches.findViewerWithPreferenceByUserId(userId);
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
      this.matches,
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
    const viewerEval =
      await this.matches.findLatestEvaluationForProfile(viewer.id);
    if (!viewerEval) {
      throw new MatchListViewerEvaluationMissingError();
    }

    return {
      status: 'ready',
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
      viewerDatingChapter: viewer.datingChapter ?? null,
      viewerAgeYears: viewerBridge.derivedSelfAgeYears,
    };
  }

  async fetchMatchListRankPage(
    viewerUserId: string,
    cursor: MatchListCursorPayload | null,
    take: number,
  ): Promise<RankPageRow[]> {
    return this.ranks.fetchMatchListRankPage(viewerUserId, cursor, take);
  }
}
