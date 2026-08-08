import { Injectable } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import type { MatchListCursorPayload } from '../../cache/match-list-cache';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { latestEvaluationForProfile } from '../me-profile-analysis.service';
import { buildMatchCandidateSqlPrefilterWhere } from '../me-matches-candidate-sql-prefilter';
import { MatchListViewerEvaluationMissingError } from '../me-matches.errors';
import { countApprovedPhotosForProfile } from '../me-profile-photo-gate';
import { buildProductProfileMatchingBridge } from '../user-profile-matching-bridge.contract';
import { matchListRankAfterCursorWhere } from './match-list-cursor';
import {
  STATUS_ANALYZED,
  partnerGenderSourceForMeMatchesRow,
} from './match-list.helpers';

@Injectable()
export class MatchListQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ─── Candidate selects ─────────────────────────────────────────────────────
  // `UserProfile.interestsTop` and `sig*` are excluded — engine/HG inputs come only from
  // `buildMeMatchesParticipantReadModel` (latest evaluation + optional normalized rows).
  // List omits about* free-text (and unused city/country/status/user); detail keeps them.
  // Hard-block list UX batch-loads about* only for the existing hard-fail subset.

  /** Slim select for match-list rebuild (`buildFullRankedList`). */
  /** Slim select for match-list rebuild (`buildFullRankedList`). */
  readonly candidateSelectList = {
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
  readonly candidateSelectDetail = {
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

  matchCandidateBaseWhere(viewerUserId: string) {
    return {
      userId: { not: viewerUserId },
      status: STATUS_ANALYZED,
      user: { deletedAt: null },
    };
  }

  matchCandidatePhotoEligibleWhere(
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
}
