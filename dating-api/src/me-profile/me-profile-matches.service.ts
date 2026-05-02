import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildProductProfileMatchingBridge,
  reciprocalProductGenderEligibility,
} from './user-profile-matching-bridge.contract';

const STATUS_ANALYZED = 'ANALYZED' as UserProfileStatus;

// ─── Response shape ───────────────────────────────────────────────────────────

export interface MeProfileMatchesCandidateDto {
  /** `UserProfile.id` of the candidate. */
  userProfileId: string;
  /** Canonical gender string from the bridge; null when unset on the candidate row. */
  gender: string | null;
  /** Whole years derived from `birthDate`; null when birth date is unset. */
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  /** True when at least one `UserProfileEvaluation` row exists for this candidate. */
  hasEvaluation: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
}

export interface MeProfileMatchesResponseDto {
  viewerProfileId: string;
  /** Canonical gender of the authenticated viewer; null when unset. */
  viewerGender: string | null;
  /**
   * Partner genders the viewer accepts (from `UserProfile.desiredPartnerGenders`).
   * `null` means no gender filter was applied from the viewer's product field.
   */
  viewerAcceptedPartnerGenders: string[] | null;
  /** Candidate count before reciprocal gender filter. */
  totalCandidatesBeforeFilter: number;
  /** Candidates that passed the reciprocal gender eligibility check. */
  candidates: MeProfileMatchesCandidateDto[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Phase 3 Step 4 — product `UserProfile` → candidate retrieval with gender-aware filtering.
 *
 * **Active path (new product flow):**
 * 1. Viewer identity comes from the authenticated session (`userId`).
 * 2. Viewer profile is loaded from `UserProfile`; bridge maps it to canonical prefs.
 * 3. Candidates are ALL other `UserProfile` rows with `status = ANALYZED`.
 * 4. Reciprocal gender eligibility: both viewer→candidate AND candidate→viewer must pass
 *    (`reciprocalProductGenderEligibility` from the bridge contract).
 * 5. Legacy `MatchmakingProfile` rows are NOT touched by this path.
 */
@Injectable()
export class MeProfileMatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async getMatchesForUser(userId: string): Promise<MeProfileMatchesResponseDto> {
    const viewer = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!viewer) {
      this.obs.trace(
        `me profile matches: no profile for userId=${userId}`,
        ErrorCodes.ME_PROFILE_MATCHES_NO_PROFILE,
      );
      throw new NotFoundException(
        'No profile exists for this account. Create a profile first.',
      );
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(viewer, asOf);

    // Candidates: all ANALYZED profiles that are not the viewer.
    // Select only the fields required by the bridge + response shape to keep the query tight.
    const candidateRows = await this.prisma.userProfile.findMany({
      where: { userId: { not: userId }, status: STATUS_ANALYZED },
      select: {
        id: true,
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
        _count: { select: { evaluations: true } },
        photos: {
          where: { status: 'APPROVED' as const },
          select: { id: true, isPrimary: true },
        },
      },
    });

    const totalBeforeFilter = candidateRows.length;

    const candidates: MeProfileMatchesCandidateDto[] = [];
    for (const row of candidateRows) {
      const candidateBridge = buildProductProfileMatchingBridge(row, asOf);

      /**
       * Gender eligibility rule (both directions must pass):
       * - viewer's `acceptedPartnerGenders` must include the candidate's gender
       * - candidate's `acceptedPartnerGenders` must include the viewer's gender
       * When either party has no `desiredPartnerGenders` set, that direction is a
       * free pass (no filter from the product field alone).
       */
      const eligible = reciprocalProductGenderEligibility(
        viewerBridge.acceptedPartnerGenders,
        viewerBridge.selfGender,
        candidateBridge.acceptedPartnerGenders,
        candidateBridge.selfGender,
      );

      if (eligible) {
        const approvedPhotos = row.photos ?? [];
        candidates.push({
          userProfileId: row.id,
          gender: candidateBridge.selfGender,
          ageYears: candidateBridge.derivedSelfAgeYears,
          locationLabel: candidateBridge.location.locationLabel,
          analyzedAt: row.analyzedAt?.toISOString() ?? null,
          hasEvaluation: row._count.evaluations > 0,
          primaryPhotoUrl: buildMatchPrimaryPhotoUrl(
            row.id,
            pickApprovedPrimaryPhotoId(approvedPhotos),
          ),
          approvedPhotoCount: approvedPhotos.length,
        });
      }
    }

    this.obs.trace(
      `me profile matches profileId=${viewer.id} viewerGender=${viewerBridge.selfGender} ` +
        `accepted=${JSON.stringify(viewerBridge.acceptedPartnerGenders)} ` +
        `before=${totalBeforeFilter} after=${candidates.length}`,
      ErrorCodes.ME_PROFILE_MATCHES_OK,
    );

    return {
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      totalCandidatesBeforeFilter: totalBeforeFilter,
      candidates,
    };
  }
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
