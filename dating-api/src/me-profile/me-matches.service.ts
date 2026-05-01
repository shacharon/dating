import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
import { latestEvaluationForProfile } from './me-profile-analysis.service';
import {
  buildChildrenUnsureRowFromNewModel,
  buildProfilePayloadFromNewModel,
} from './me-profile-engine.mapper';
import {
  buildProductProfileMatchingBridge,
  reciprocalProductGenderEligibility,
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
   * Curated analysis headline from `UserProfileEvaluation.evaluationJson.display.summary`.
   * Null when no evaluation exists or the field is absent.
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
 * - Source of truth is `UserProfile` + `UserProfileEvaluation`.
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
    // HG structured preferences
    partnerAgeMin: true,
    partnerAgeMax: true,
    minimumPartnerEducation: true,
    acceptedPartnerSmoking: true,
    acceptedPartnerAlcohol: true,
    partnerWantsChildren: true,
    partnerHasChildren: true,
    acceptedPartnerReligions: true,
    maxDistanceKm: true,
    similarityPreference: true,
    _count: { select: { evaluations: true } },
  } as const;

  // ─── list ──────────────────────────────────────────────────────────────────

  async list(userId: string): Promise<MeMatchesListResponseDto> {
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
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
    const viewerBridge = buildProductProfileMatchingBridge(viewer, asOf);

    // Load viewer evaluation for engine scoring. Present when status = ANALYZED per lifecycle contract.
    const viewerEval = await latestEvaluationForProfile(this.prisma, viewer.id);
    const viewerPayload = viewerEval
      ? buildProfilePayloadFromNewModel(viewer, viewerEval)
      : null;

    const candidateRows = await this.prisma.userProfile.findMany({
      where: { userId: { not: userId }, status: STATUS_ANALYZED },
      select: this.candidateSelect,
    });

    const totalBeforeFilter = candidateRows.length;

    // Batch-load latest evaluation per candidate (one query; keep first per profileId — DESC order).
    const candidateEvalRows = await this.prisma.userProfileEvaluation.findMany({
      where: { profileId: { in: candidateRows.map((r) => r.id) } },
      orderBy: { createdAt: 'desc' },
      select: { profileId: true, evaluationJson: true, createdAt: true },
    });
    const latestEvalByProfile = new Map<
      string,
      (typeof candidateEvalRows)[number]
    >();
    for (const ev of candidateEvalRows) {
      if (!latestEvalByProfile.has(ev.profileId)) {
        latestEvalByProfile.set(ev.profileId, ev);
      }
    }

    const viewerHgRow = buildChildrenUnsureRowFromNewModel(viewer);
    const matches: MeMatchItemDto[] = [];

    for (const row of candidateRows) {
      const candidateBridge = buildProductProfileMatchingBridge(row, asOf);
      const eligible = reciprocalProductGenderEligibility(
        viewerBridge.acceptedPartnerGenders,
        viewerBridge.selfGender,
        candidateBridge.acceptedPartnerGenders,
        candidateBridge.selfGender,
      );

      if (!eligible) continue;

      // HG Layer-3 hard-eligibility gate: exclude only when both rows carry structured
      // HG data AND either direction is an explicit FAIL. Missing HG data → PASS (lenient).
      const candidateHgRow = buildChildrenUnsureRowFromNewModel(row);
      const hgDirections = evaluateHolyGrailPairDirections(viewerHgRow, candidateHgRow);
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

      const candidateEval = latestEvalByProfile.get(row.id);
      if (viewerPayload && candidateEval) {
        const candidatePayload = buildProfilePayloadFromNewModel(row, candidateEval);
        const result = compareWithStatus(viewerPayload, candidatePayload);
        if (!('status' in result)) {
          matchScore = result.finalScore;
          explainability = result.explainability;
          recommendation = result.recommendation;
        }
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
    });

    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new NotFoundException(
        'Your profile is not ready for matching. Complete your profile and run analysis first.',
      );
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(viewer, asOf);

    // Load candidate by UserProfile.id — never by userId (no foreign-key exposure).
    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: this.candidateSelect,
    });

    if (!candidate || candidate.status !== STATUS_ANALYZED) {
      throw new NotFoundException('Match not found.');
    }

    const candidateBridge = buildProductProfileMatchingBridge(candidate, asOf);
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

    // HG Layer-3 hard-eligibility gate (same policy as list).
    const viewerHgRow = buildChildrenUnsureRowFromNewModel(viewer);
    const candidateHgRow = buildChildrenUnsureRowFromNewModel(candidate);
    const hgDirections = evaluateHolyGrailPairDirections(viewerHgRow, candidateHgRow);
    if (
      hgDirections !== null &&
      (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
        hgDirections.bToA.overallHardEligibility === 'FAIL')
    ) {
      throw new NotFoundException('Match not found.');
    }

    // Load evaluations for both viewer and candidate — used for summary and engine scoring.
    const [viewerEval, candidateEval] = await Promise.all([
      latestEvaluationForProfile(this.prisma, viewer.id),
      latestEvaluationForProfile(this.prisma, candidate.id),
    ]);

    const evaluationSummary = extractDisplaySummary(candidateEval?.evaluationJson);

    let matchScore: number | null = null;
    let explainability: MatchExplainabilityDto | null = null;
    let recommendation: MatchRecommendationDto | null = null;

    if (viewerEval && candidateEval) {
      const viewerPayload = buildProfilePayloadFromNewModel(viewer, viewerEval);
      const candidatePayload = buildProfilePayloadFromNewModel(candidate, candidateEval);
      const result = compareWithStatus(viewerPayload, candidatePayload);
      if (!('status' in result)) {
        matchScore = result.finalScore;
        explainability = result.explainability;
        recommendation = result.recommendation;
      }
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

function extractDisplaySummary(evaluationJson: unknown): string | null {
  if (
    evaluationJson !== null &&
    typeof evaluationJson === 'object' &&
    'display' in evaluationJson
  ) {
    const display = (evaluationJson as Record<string, unknown>)['display'];
    if (
      display !== null &&
      typeof display === 'object' &&
      'summary' in display &&
      typeof (display as Record<string, unknown>)['summary'] === 'string'
    ) {
      return (display as Record<string, unknown>)['summary'] as string;
    }
  }
  return null;
}
