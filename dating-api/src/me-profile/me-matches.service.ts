import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchActionType,
  MutualMatchStatus,
  UserProfilePhotoStatus,
  type UserProfileStatus,
} from '@prisma/client';
import {
  latestEvaluationForProfile,
  latestEvaluationsForProfileIds,
} from './me-profile-analysis.service';
import { buildMeMatchesParticipantReadModel } from './me-profile-engine.mapper';
import {
  buildProductProfileMatchingBridge,
  reciprocalProductGenderEligibility,
  type ProductProfilePartnerGenderPreferenceSource,
} from './user-profile-matching-bridge.contract';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import { PrismaService } from '../prisma/prisma.service';
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

const STATUS_ANALYZED = 'ANALYZED' as UserProfileStatus;

/**
 * When `ENGINE_READ_NORMALIZED=1` the match engine reads signals + interests from the
 * normalized `UserProfileSignal` / `UserProfileInterest` tables instead of the stored
 * evaluation blob. The blob remains the fallback for profiles with no normalized rows.
 * Flag off (default) → pure evaluation-blob path, zero behaviour change.
 */
const USE_NORMALIZED = process.env['ENGINE_READ_NORMALIZED'] === '1';

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
export class MeMatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    private readonly mutualMatches: MutualMatchesService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ─── Shared candidate select ───────────────────────────────────────────────
  // `UserProfile.interestsTop` and `sig*` are excluded — engine/HG inputs come only from
  // `buildMeMatchesParticipantReadModel` (latest evaluation + optional normalized rows).
  // `signals` and `interests` are always selected; the assembler uses them only when
  // ENGINE_READ_NORMALIZED=1 (zero-cost when flag is off).

  private candidateSelect = {
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
    // HG structured facts
    childrenStatus: true,
    wantsChildren: true,
    smokingFrequency: true,
    alcoholUse: true,
    education: true,
    religion: true,
    // HG structured preferences live on UserProfilePreference (Phase F).
    preference: true,
    // Normalized signal / interest rows for ENGINE_READ_NORMALIZED assembly.
    signals: {
      select: { signalKey: true, signalValue: true, evalVersion: true },
    },
    interests: {
      select: { tag: true, rank: true, evalVersion: true },
      orderBy: { rank: 'asc' as const },
    },
    photos: {
      where: { status: 'APPROVED' as const },
      select: { id: true, isPrimary: true },
    },
    _count: { select: { evaluations: true } },
    user: { select: { deletedAt: true } },
  } as const;

  // ─── list ──────────────────────────────────────────────────────────────────

  async list(userId: string): Promise<MeMatchesListResponseDto> {
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
      this.analytics.track(
        userId,
        ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED,
        {
          surface: 'match_list',
        },
      );
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
        useNormalized: USE_NORMALIZED,
      },
    );
    if (viewerRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${viewer.id} reason=${viewerRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }

    const [totalAnalyzedCandidates, candidateRows] = await Promise.all([
      this.prisma.userProfile.count({
        where: this.matchCandidateBaseWhere(userId),
      }),
      this.prisma.userProfile.findMany({
        where: this.matchCandidatePhotoEligibleWhere(userId),
        select: this.candidateSelect,
      }),
    ]);

    const totalBeforeFilter = candidateRows.length;
    const filteredNoPhotoCandidates =
      totalAnalyzedCandidates - totalBeforeFilter;

    const latestEvalByProfile = await latestEvaluationsForProfileIds(
      this.prisma,
      candidateRows.map((r) => r.id),
    );

    const actionByTargetUserId = new Map(
      (
        await this.prisma.matchAction.findMany({
          where: { actorUserId: userId },
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

    for (const row of candidateRows) {
      const candidateBridge = buildProductProfileMatchingBridge(
        row,
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
        candidateProfileCore,
        candidatePreference ?? null,
        candidateEval,
        {
          signals: candidateSignals,
          interests: candidateInterests,
          useNormalized: USE_NORMALIZED,
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

      let hardBlocked: HardBlockedDto | undefined;
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
        hardBlocked = this.buildHardBlockedDto(
          hgDirections!,
          viewerDealbreakerSignals,
          viewerSelfHints,
          {
            aboutMe: candidateProfileCore.aboutMe,
            aboutPartner: candidateProfileCore.aboutPartner,
            aboutRelationship: candidateProfileCore.aboutRelationship,
          },
        );
        if (hardBlocked === undefined) {
          continue;
        }
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

      matches.push({
        id: row.id,
        nickname: row.nickname?.trim() ? row.nickname.trim() : null,
        gender: candidateBridge.selfGender,
        ageYears: candidateBridge.derivedSelfAgeYears,
        locationLabel: candidateBridge.location.locationLabel,
        analyzedAt: row.analyzedAt?.toISOString() ?? null,
        hasEvaluation: row._count.evaluations > 0,
        matchScore,
        profileAnalysisStale: row.updatedAt > candidateEval.createdAt,
        primaryPhotoUrl: buildMatchPrimaryPhotoUrl(
          row.id,
          pickApprovedPrimaryPhotoId(approvedPhotos),
        ),
        approvedPhotoCount: approvedPhotos.length,
        explainability,
        recommendation,
        yourAction: matchActionToYourAction(
          actionByTargetUserId.get(row.userId) ?? null,
        ),
        ...(hardBlocked !== undefined ? { hardBlocked } : {}),
      });
    }

    // Eligible first (score DESC); hard-blocked existing append at bottom (score DESC within).
    matches.sort((a, b) => {
      const aBlocked = a.hardBlocked ? 1 : 0;
      const bBlocked = b.hardBlocked ? 1 : 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;
      const aScore = a.matchScore ?? -1;
      const bScore = b.matchScore ?? -1;
      return bScore - aScore;
    });

    this.obs.trace(
      `me matches list profileId=${viewer.id} before=${totalBeforeFilter} after=${matches.length} filteredNoPhoto=${filteredNoPhotoCandidates}`,
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

    this.analytics.track(userId, ProductAnalyticsEvents.MATCH_LIST_VIEWED, {
      matchCount: matches.length,
      viewerProfileId: viewer.id,
    });

    return {
      status: 'ready',
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
      totalCandidatesBeforeFilter: totalBeforeFilter,
      filteredNoPhotoCandidates,
      matches,
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
      select: this.candidateSelect,
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
      select: this.candidateSelect,
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
        useNormalized: USE_NORMALIZED,
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
        useNormalized: USE_NORMALIZED,
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
    if (!('status' in result)) {
      matchScore = result.finalScore;
      explainability = result.explainability;
      recommendation = result.recommendation;
      const built = buildMatchExplanationTraits(
        result.explainability.positiveChips,
        result.finalScore,
      );
      matchExplanationTraits = built.length > 0 ? built : undefined;
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
      primaryPhotoUrl: buildMatchPrimaryPhotoUrl(
        candidate.id,
        pickApprovedPrimaryPhotoId(candidate.photos ?? []),
      ),
      approvedPhotoCount: (candidate.photos ?? []).length,
      explainability,
      recommendation,
      ...(hardBlocked !== undefined ? { hardBlocked } : {}),
    };
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

  private matchCandidatePhotoEligibleWhere(viewerUserId: string) {
    return {
      ...this.matchCandidateBaseWhere(viewerUserId),
      photos: { some: { status: UserProfilePhotoStatus.APPROVED } },
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

function buildMatchPrimaryPhotoUrl(
  profileId: string,
  photoId: string | null,
): string | null {
  if (!photoId) return null;
  return `/api/v1/me/matches/${profileId}/photos/${photoId}/file`;
}
