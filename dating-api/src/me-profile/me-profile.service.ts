import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProfileGender, UserProfile, UserProfileStatus } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { markHttpExceptionObservabilityLogged } from '../logging/observability-http.exception';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import type {
  CreateMeProfileDto,
  MeLatestAnalysisResponseDto,
  MeProfileResponseDto,
  PatchMeProfileDto,
} from './me-profile.dto';
import { latestEvaluationForProfile } from './me-profile-analysis.service';

const PROFILE_GENDER_VALUES = new Set<string>(
  Object.values(ProfileGender) as string[],
);

function parseDesiredPartnerGenders(
  raw: Prisma.JsonValue | null,
): ProfileGender[] | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: ProfileGender[] = [];
  for (const x of raw) {
    if (typeof x !== 'string' || !PROFILE_GENDER_VALUES.has(x)) {
      return null;
    }
    out.push(x as ProfileGender);
  }
  return out.length > 0 ? out : null;
}

/**
 * Statuses that are eligible to be re-submitted.
 * SUBMITTED and ANALYZING are rejected — an in-flight submission is already pending.
 *
 * String literals are used here so the guard works before `prisma generate` is
 * run after the migration. Once the client is regenerated, the enum values will
 * resolve to the same strings.
 */
const SUBMITTABLE_STATUSES = new Set<string>([
  'DRAFT',
  'ANALYZED',
  'FAILED',
]);

function toResponse(row: UserProfile): MeProfileResponseDto {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    onboardingStep: row.onboardingStep,
    aboutMe: row.aboutMe,
    aboutPartner: row.aboutPartner,
    aboutRelationship: row.aboutRelationship,
    birthDate: row.birthDate ?? null,
    gender: row.gender ?? null,
    desiredPartnerGenders: parseDesiredPartnerGenders(row.desiredPartnerGenders),
    city: row.city ?? null,
    country: row.country ?? null,
    locationLabel: row.locationLabel ?? null,
    submittedAt: row.submittedAt ?? null,
    analyzedAt: row.analyzedAt ?? null,
    lastAnalysisError: row.lastAnalysisError ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // HG structured facts
    childrenStatus: row.childrenStatus ?? null,
    wantsChildren: row.wantsChildren ?? null,
    smokingFrequency: row.smokingFrequency ?? null,
    alcoholUse: row.alcoholUse ?? null,
    education: row.education ?? null,
    religion: row.religion ?? null,
    // HG structured preferences
    partnerAgeMin: row.partnerAgeMin ?? null,
    partnerAgeMax: row.partnerAgeMax ?? null,
    minimumPartnerEducation: row.minimumPartnerEducation ?? null,
    acceptedPartnerSmoking: row.acceptedPartnerSmoking,
    acceptedPartnerAlcohol: row.acceptedPartnerAlcohol,
    partnerWantsChildren: row.partnerWantsChildren ?? null,
    partnerHasChildren: row.partnerHasChildren ?? null,
    acceptedPartnerReligions: row.acceptedPartnerReligions,
    maxDistanceKm: row.maxDistanceKm ?? null,
    similarityPreference: row.similarityPreference ?? null,
  };
}

function toPrismaWritableData(
  body: CreateMeProfileDto | PatchMeProfileDto,
): Prisma.UserProfileUpdateInput {
  const data: Prisma.UserProfileUpdateInput = {};
  if (body.aboutMe !== undefined) {
    data.aboutMe = body.aboutMe;
  }
  if (body.aboutPartner !== undefined) {
    data.aboutPartner = body.aboutPartner;
  }
  if (body.aboutRelationship !== undefined) {
    data.aboutRelationship = body.aboutRelationship;
  }
  if (body.onboardingStep !== undefined) {
    data.onboardingStep = body.onboardingStep;
  }
  if (body.birthDate !== undefined) {
    data.birthDate =
      body.birthDate === null ? null : new Date(body.birthDate);
  }
  if (body.gender !== undefined) {
    // DB column is NOT NULL; DTO allows null (cleared / prefer-not-to-say intent).
    data.gender = body.gender ?? ProfileGender.PREFER_NOT_TO_SAY;
  }
  if (body.city !== undefined) {
    data.city = body.city;
  }
  if (body.country !== undefined) {
    data.country = body.country;
  }
  if (body.locationLabel !== undefined) {
    data.locationLabel = body.locationLabel;
  }
  if (body.desiredPartnerGenders !== undefined) {
    data.desiredPartnerGenders =
      body.desiredPartnerGenders === null
        ? Prisma.DbNull
        : body.desiredPartnerGenders;
  }

  // HG structured facts
  if (body.childrenStatus !== undefined) data.childrenStatus = body.childrenStatus;
  if (body.wantsChildren !== undefined) data.wantsChildren = body.wantsChildren;
  if (body.smokingFrequency !== undefined) data.smokingFrequency = body.smokingFrequency;
  if (body.alcoholUse !== undefined) data.alcoholUse = body.alcoholUse;
  if (body.education !== undefined) data.education = body.education;
  if (body.religion !== undefined) data.religion = body.religion;

  // HG structured preferences
  if (body.partnerAgeMin !== undefined) data.partnerAgeMin = body.partnerAgeMin;
  if (body.partnerAgeMax !== undefined) data.partnerAgeMax = body.partnerAgeMax;
  if (body.minimumPartnerEducation !== undefined) data.minimumPartnerEducation = body.minimumPartnerEducation;
  if (body.acceptedPartnerSmoking !== undefined) data.acceptedPartnerSmoking = body.acceptedPartnerSmoking ?? [];
  if (body.acceptedPartnerAlcohol !== undefined) data.acceptedPartnerAlcohol = body.acceptedPartnerAlcohol ?? [];
  if (body.partnerWantsChildren !== undefined) data.partnerWantsChildren = body.partnerWantsChildren;
  if (body.partnerHasChildren !== undefined) data.partnerHasChildren = body.partnerHasChildren;
  if (body.acceptedPartnerReligions !== undefined) data.acceptedPartnerReligions = body.acceptedPartnerReligions ?? [];
  if (body.maxDistanceKm !== undefined) data.maxDistanceKm = body.maxDistanceKm;
  if (body.similarityPreference !== undefined) data.similarityPreference = body.similarityPreference;

  return data;
}

@Injectable()
export class MeProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analysis: MeProfileAnalysisService,
  ) {}

  async getForUser(userId: string): Promise<MeProfileResponseDto | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    return row ? toResponse(row) : null;
  }

  /**
   * Latest `UserProfileEvaluation` for the current user's product profile only.
   * Does not read legacy MatchmakingProfile / ProfileEvaluation.
   */
  async getLatestAnalysisForUser(
    userId: string,
  ): Promise<MeLatestAnalysisResponseDto> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account yet. Use POST /api/v1/me/profile to create one.',
      });
    }

    const latest = await latestEvaluationForProfile(this.prisma, profile.id);

    this.obs.trace(
      `me profile latest analysis profileId=${profile.id} hasEval=${Boolean(latest)}`,
      ErrorCodes.ME_PROFILE_ANALYSIS_LATEST_OK,
    );

    if (!latest) {
      return {
        userProfileId: profile.id,
        evaluationId: null,
        createdAt: null,
        evaluationJson: null,
      };
    }

    return {
      userProfileId: profile.id,
      evaluationId: latest.id,
      createdAt: latest.createdAt.toISOString(),
      evaluationJson: latest.evaluationJson,
    };
  }

  async createForUser(
    userId: string,
    body: CreateMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    if (!body.gender) {
      const ex = new UnprocessableEntityException({
        error: 'gender_required',
        message: 'gender is required to create a profile',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }

    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      this.obs.error(
        'me profile POST: profile already exists for user',
        ErrorCodes.ME_PROFILE_CREATE_CONFLICT,
      );
      throw new ConflictException({
        error: 'profile_already_exists',
        message:
          'A profile already exists for this account. Use PATCH /api/v1/me/profile to update it.',
      });
    }

    try {
      const row = await this.prisma.userProfile.create({
        data: {
          user: { connect: { id: userId } },
          status: UserProfileStatus.DRAFT,
          ...toPrismaWritableData(body),
        } as Prisma.UserProfileCreateInput,
      });
      this.obs.trace(
        `me profile created profileId=${row.id}`,
        ErrorCodes.ME_PROFILE_CREATE_SUCCESS,
      );
      return toResponse(row);
    } catch (e: unknown) {
      this.obs.error(
        'me profile create persistence failed',
        ErrorCodes.ME_PROFILE_SAVE_FAILED,
        e,
      );
      const ex = new InternalServerErrorException({
        message: 'Profile could not be created',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }

  async patchForUser(
    userId: string,
    body: PatchMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }

    const data = toPrismaWritableData(body);

    if (Object.keys(data).length === 0) {
      this.obs.trace(
        `me profile patched (no field changes) profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_PATCH_SUCCESS,
      );
      return toResponse(existing);
    }

    try {
      const row = await this.prisma.userProfile.update({
        where: { userId },
        data,
      });
      this.obs.trace(
        `me profile patched profileId=${row.id}`,
        ErrorCodes.ME_PROFILE_PATCH_SUCCESS,
      );
      return toResponse(row);
    } catch (e: unknown) {
      this.obs.error(
        'me profile patch persistence failed',
        ErrorCodes.ME_PROFILE_SAVE_FAILED,
        e,
      );
      const ex = new InternalServerErrorException({
        message: 'Profile could not be saved',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }

  /**
   * Transitions the profile to SUBMITTED.
   *
   * Allowed prior states: DRAFT, ANALYZED, FAILED.
   * Rejected prior states: SUBMITTED (already pending), ANALYZING (in flight).
   *
   * The transition to ANALYZING happens when the analysis worker picks up the
   * job — not here. This method only sets the gate state.
   */
  async submitForUser(userId: string): Promise<MeProfileResponseDto> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }

    if (!SUBMITTABLE_STATUSES.has(existing.status as string)) {
      this.obs.error(
        `me profile submit rejected: invalid state ${existing.status} profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE,
      );
      const ex = new UnprocessableEntityException({
        error: 'invalid_submit_state',
        currentStatus: existing.status,
        allowedStatuses: [...SUBMITTABLE_STATUSES],
        message: `Profile cannot be submitted from status "${existing.status}". Allowed: ${[...SUBMITTABLE_STATUSES].join(', ')}.`,
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }

    if (!existing.gender) {
      this.obs.error(
        `me profile submit rejected: gender missing profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE,
      );
      const ex = new UnprocessableEntityException({
        error: 'gender_required',
        message: 'gender must be set before submitting the profile',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }

    try {
      const row = await this.prisma.userProfile.update({
        where: { userId },
        data: {
          status: UserProfileStatus.SUBMITTED,
          submittedAt: new Date(),
          lastAnalysisError: null,
        },
      });
      this.obs.trace(
        `me profile submitted profileId=${row.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_SUCCESS,
      );

      // Fire-and-forget: analysis manages its own ANALYZING → ANALYZED | FAILED
      // transitions. The submit response returns immediately with SUBMITTED.
      void this.analysis.runForUser(userId).catch((e: unknown) => {
        this.obs.error(
          `me profile analysis fire-and-forget threw profileId=${row.id}`,
          ErrorCodes.ME_PROFILE_ANALYSIS_FAILED,
          e,
        );
      });

      return toResponse(row);
    } catch (e: unknown) {
      this.obs.error(
        'me profile submit persistence failed',
        ErrorCodes.ME_PROFILE_SUBMIT_FAILED,
        e,
      );
      const ex = new InternalServerErrorException({
        message: 'Profile could not be submitted',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }
}
