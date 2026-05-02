import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
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
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateHolyGrailPairDirections } from '../matches/holy-grail-pair-directions';
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
const USE_NORMALIZED = process.env['גםק'] === '1';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface MeMatchItemDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  /** True when at least one `UserProfileEvaluation` row exists for this candidate. */
  hasEvaluation: boolean;
  /** Engine final score (0–100). Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
}

export interface MeMatchesListResponseDto {
  status: 'ready' | 'not_ready';
  /**
   * Present when `status = 'not_ready'`.
   * - `no_profile` — viewer has never created a product profile.
   * - `not_analyzed` — profile exists but has not completed analysis yet.
   */
  reason?: 'no_profile' | 'not_analyzed';
  /** Present when `status = 'ready'`. */
  viewerProfileId?: string;
  viewerGender?: string | null;
  viewerAcceptedPartnerGenders?: string[] | null;
  totalCandidatesBeforeFilter?: number;
  matches?: MeMatchItemDto[];
}

export interface MeMatchDetailDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
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
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
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
  ) {}

  // ─── Shared candidate select ───────────────────────────────────────────────
  // `UserProfile.interestsTop` and `sig*` are excluded — engine/HG inputs come only from
  // `buildMeMatchesParticipantReadModel` (latest evaluation + optional normalized rows).
  // `signals` and `interests` are always selected; the assembler uses them only when
  // ENGINE_READ_NORMALIZED=1 (zero-cost when flag is off).

  private candidateSelect = {
    id: true,
    name: true,
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
    signals: { select: { signalKey: true, signalValue: true } },
    interests: {
      select: { tag: true, rank: true },
      orderBy: { rank: 'asc' as const },
    },
    _count: { select: { evaluations: true } },
  } as const;

  // ─── list ──────────────────────────────────────────────────────────────────

  async list(userId: string): Promise<MeMatchesListResponseDto> {
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        preference: true,
        signals: { select: { signalKey: true, signalValue: true } },
        interests: {
          select: { tag: true, rank: true },
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

    const candidateRows = await this.prisma.userProfile.findMany({
      where: { userId: { not: userId }, status: STATUS_ANALYZED },
      select: this.candidateSelect,
    });

    const totalBeforeFilter = candidateRows.length;

    const latestEvalByProfile = await latestEvaluationsForProfileIds(
      this.prisma,
      candidateRows.map((r) => r.id),
    );

    const matches: MeMatchItemDto[] = [];

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
      if (
        hgDirections !== null &&
        (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
          hgDirections.bToA.overallHardEligibility === 'FAIL')
      ) {
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

      matches.push({
        id: row.id,
        gender: candidateBridge.selfGender,
        ageYears: candidateBridge.derivedSelfAgeYears,
        locationLabel: candidateBridge.location.locationLabel,
        analyzedAt: row.analyzedAt?.toISOString() ?? null,
        hasEvaluation: row._count.evaluations > 0,
        matchScore,
        explainability,
        recommendation,
      });
    }

    this.obs.trace(
      `me matches list profileId=${viewer.id} before=${totalBeforeFilter} after=${matches.length}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );

    return {
      status: 'ready',
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      totalCandidatesBeforeFilter: totalBeforeFilter,
      matches,
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
        signals: { select: { signalKey: true, signalValue: true } },
        interests: {
          select: { tag: true, rank: true },
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new NotFoundException(
        'Your profile is not ready for matching. Complete your profile and run analysis first.',
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

    if (!candidate || candidate.status !== STATUS_ANALYZED) {
      throw new NotFoundException('Match not found.');
    }

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
    if (
      hgDirections !== null &&
      (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
        hgDirections.bToA.overallHardEligibility === 'FAIL')
    ) {
      throw new NotFoundException('Match not found.');
    }

    const evaluationSummary = candidateRead.evaluationDisplaySummary;

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

    this.obs.trace(
      `me matches detail viewerProfileId=${viewer.id} candidateProfileId=${candidate.id}`,
      ErrorCodes.ME_MATCHES_DETAIL_OK,
    );

    return {
      id: candidate.id,
      gender: candidateBridge.selfGender,
      ageYears: candidateBridge.derivedSelfAgeYears,
      locationLabel: candidateBridge.location.locationLabel,
      analyzedAt: candidate.analyzedAt?.toISOString() ?? null,
      hasEvaluation: candidate._count.evaluations > 0,
      evaluationSummary,
      matchScore,
      explainability,
      recommendation,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
