import {
  Inject,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  ProfileGender,
  UserProfile,
  UserProfileOnboardingStep,
  UserProfilePreference,
  UserProfilePhotoStatus,
  UserProfileStatus,
} from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { markHttpExceptionObservabilityLogged } from '../logging/observability-http.exception';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import type {
  CreateMeProfileDto,
  MeLatestAnalysisResponseDto,
  MeProfilePhotoDto,
  MeProfileResponseDto,
  PatchMeProfileDto,
} from './me-profile.dto';
import {
  latestEvaluationForProfile,
  MeProfileAnalysisService,
} from './me-profile-analysis.service';

const PROFILE_GENDER_VALUES = new Set<string>(
  Object.values(ProfileGender) as string[],
);

/** Trims profile nicknames; blank input becomes `null`. */
function normalizeNicknameValue(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

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
 * Product JSON `desiredPartnerGenders` → `UserProfilePreference.acceptedPartnerGenders`
 * (same filter as the API DTO path; keeps the normalized row aligned with `UserProfile`).
 */
function acceptedPartnerGendersFromDesiredJson(
  raw: Prisma.JsonValue | null | undefined,
): string[] {
  if (raw === null || raw === undefined || !Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (g): g is string =>
      typeof g === 'string' && g !== ProfileGender.PREFER_NOT_TO_SAY,
  );
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
const PHOTO_MAX_COUNT = 3;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
type UploadedPhotoFile = {
  mimetype: string;
  size: number;
  originalname?: string;
  buffer: Buffer;
};

function mergedTextForOnboarding(
  existing: UserProfile | null,
  body: CreateMeProfileDto | PatchMeProfileDto,
  key: 'aboutMe' | 'aboutPartner' | 'aboutRelationship',
): string | null {
  if (body[key] !== undefined) {
    return body[key] as string | null;
  }
  return existing?.[key] ?? null;
}

function mergedDesiredPartnerGendersForOnboarding(
  existing: UserProfile | null,
  body: CreateMeProfileDto | PatchMeProfileDto,
): ProfileGender[] | null {
  if (body.desiredPartnerGenders !== undefined) {
    if (body.desiredPartnerGenders === null) {
      return null;
    }
    return body.desiredPartnerGenders;
  }
  if (!existing) {
    return null;
  }
  return parseDesiredPartnerGenders(existing.desiredPartnerGenders);
}

function isNonEmptyTrimmedText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Enforces two-step onboarding: TEXTS requires partner genders; COMPLETED requires all three text fields.
 * BASIC is always allowed (partial saves). Analysis still only runs on {@link MeProfileService.submitForUser}.
 */
function assertOnboardingStepCoherent(
  existing: UserProfile | null,
  body: CreateMeProfileDto | PatchMeProfileDto,
): void {
  if (body.onboardingStep === undefined) {
    return;
  }
  if (body.onboardingStep === UserProfileOnboardingStep.BASIC) {
    return;
  }
  if (body.onboardingStep === UserProfileOnboardingStep.TEXTS) {
    const genders = mergedDesiredPartnerGendersForOnboarding(existing, body);
    if (!genders?.length) {
      const ex = new UnprocessableEntityException({
        error: 'onboarding_partner_genders_required',
        message:
          'Set at least one desiredPartnerGenders value before moving onboarding to TEXTS.',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
    return;
  }
  if (body.onboardingStep === UserProfileOnboardingStep.COMPLETED) {
    const aboutMe = mergedTextForOnboarding(existing, body, 'aboutMe');
    const aboutPartner = mergedTextForOnboarding(existing, body, 'aboutPartner');
    const aboutRelationship = mergedTextForOnboarding(
      existing,
      body,
      'aboutRelationship',
    );
    if (
      !isNonEmptyTrimmedText(aboutMe) ||
      !isNonEmptyTrimmedText(aboutPartner) ||
      !isNonEmptyTrimmedText(aboutRelationship)
    ) {
      const ex = new UnprocessableEntityException({
        error: 'onboarding_texts_incomplete',
        message:
          'aboutMe, aboutPartner, and aboutRelationship must all be non-empty before onboarding can be COMPLETED.',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }
}

function applyOnboardingCompletionToWriteData(
  data: Prisma.UserProfileUpdateInput,
  body: CreateMeProfileDto | PatchMeProfileDto,
  existingCompletedAt: Date | null | undefined,
): void {
  if (body.onboardingStep !== UserProfileOnboardingStep.COMPLETED) {
    return;
  }
  if (existingCompletedAt) {
    return;
  }
  data.onboardingCompletedAt = new Date();
}

function toResponse(
  row: UserProfile,
  preference: UserProfilePreference | null,
): MeProfileResponseDto {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    nickname: row.nickname ?? null,
    onboardingStep: row.onboardingStep,
    onboardingCompletedAt: row.onboardingCompletedAt ?? null,
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
    // HG structured preferences (Phase F: UserProfilePreference only)
    partnerAgeMin: preference?.partnerAgeMin ?? null,
    partnerAgeMax: preference?.partnerAgeMax ?? null,
    minimumPartnerEducation: preference?.minimumPartnerEducation ?? null,
    acceptedPartnerSmoking: preference?.acceptedPartnerSmoking ?? [],
    acceptedPartnerAlcohol: preference?.acceptedPartnerAlcohol ?? [],
    partnerWantsChildren: preference?.partnerWantsChildren ?? null,
    partnerHasChildren: preference?.partnerHasChildren ?? null,
    acceptedPartnerReligions: preference?.acceptedPartnerReligions ?? [],
    maxDistanceKm: preference?.maxDistanceKm ?? null,
    similarityPreference: preference?.similarityPreference ?? null,
  };
}

/** Plain preference field values extracted from a create/patch DTO. */
type PreferenceFields = {
  acceptedPartnerGenders?: string[];
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  minimumPartnerEducation?: string | null;
  acceptedPartnerSmoking?: string[];
  acceptedPartnerAlcohol?: string[];
  partnerWantsChildren?: string | null;
  partnerHasChildren?: string | null;
  acceptedPartnerReligions?: string[];
  maxDistanceKm?: number | null;
  similarityPreference?: string | null;
};

/**
 * Phase C dual-write: extract preference fields from a create/patch body.
 * Maps `desiredPartnerGenders` → `acceptedPartnerGenders`, dropping PREFER_NOT_TO_SAY.
 */
function toPreferenceData(
  body: CreateMeProfileDto | PatchMeProfileDto,
): PreferenceFields {
  const data: PreferenceFields = {};
  if (body.desiredPartnerGenders !== undefined) {
    data.acceptedPartnerGenders = acceptedPartnerGendersFromDesiredJson(
      body.desiredPartnerGenders === null
        ? null
        : (body.desiredPartnerGenders as unknown as Prisma.JsonValue),
    );
  }
  if (body.partnerAgeMin !== undefined) data.partnerAgeMin = body.partnerAgeMin;
  if (body.partnerAgeMax !== undefined) data.partnerAgeMax = body.partnerAgeMax;
  if (body.minimumPartnerEducation !== undefined)
    data.minimumPartnerEducation = body.minimumPartnerEducation;
  if (body.acceptedPartnerSmoking !== undefined)
    data.acceptedPartnerSmoking = body.acceptedPartnerSmoking ?? [];
  if (body.acceptedPartnerAlcohol !== undefined)
    data.acceptedPartnerAlcohol = body.acceptedPartnerAlcohol ?? [];
  if (body.partnerWantsChildren !== undefined)
    data.partnerWantsChildren = body.partnerWantsChildren;
  if (body.partnerHasChildren !== undefined)
    data.partnerHasChildren = body.partnerHasChildren;
  if (body.acceptedPartnerReligions !== undefined)
    data.acceptedPartnerReligions = body.acceptedPartnerReligions ?? [];
  if (body.maxDistanceKm !== undefined) data.maxDistanceKm = body.maxDistanceKm;
  if (body.similarityPreference !== undefined)
    data.similarityPreference = body.similarityPreference;
  return data;
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
  if (body.nickname !== undefined) {
    data.nickname = normalizeNicknameValue(body.nickname);
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

  return data;
}

@Injectable()
export class MeProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analysis: MeProfileAnalysisService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  private async assertNicknameAvailable(
    nickname: string,
    excludeProfileId: string | null,
  ): Promise<void> {
    const taken = await this.prisma.userProfile.findFirst({
      where: {
        nickname,
        ...(excludeProfileId ? { NOT: { id: excludeProfileId } } : {}),
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException({
        error: 'nickname_taken',
        message: 'This nickname is already in use.',
      });
    }
  }

  private async requireProfileForUser(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }
    return profile;
  }

  private toPhotoDto(row: {
    id: string;
    profileId: string;
    storageKey: string;
    originalFileName: string | null;
    mimeType: string;
    sizeBytes: number;
    position: number;
    isPrimary: boolean;
    status: UserProfilePhotoStatus;
    moderationProvider: string | null;
    moderationResultJson: Prisma.JsonValue | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MeProfilePhotoDto {
    return {
      ...row,
      moderationResultJson: row.moderationResultJson as unknown | null,
    };
  }

  async listPhotosForUser(userId: string): Promise<MeProfilePhotoDto[]> {
    const profile = await this.requireProfileForUser(userId);
    const rows = await this.prisma.userProfilePhoto.findMany({
      where: { profileId: profile.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toPhotoDto(r));
  }

  async uploadPhotoForUser(
    userId: string,
    file: UploadedPhotoFile | undefined,
  ): Promise<MeProfilePhotoDto> {
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'photo_file_required',
        message: 'Attach a multipart file field named "file".',
      });
    }
    if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new UnprocessableEntityException({
        error: 'photo_invalid_mime_type',
        message: `Allowed mime types: ${[...ALLOWED_PHOTO_MIME_TYPES].join(', ')}`,
      });
    }
    if (file.size > PHOTO_MAX_BYTES) {
      throw new UnprocessableEntityException({
        error: 'photo_file_too_large',
        message: 'Max file size is 5MB.',
      });
    }

    const profile = await this.requireProfileForUser(userId);
    const existing = await this.prisma.userProfilePhoto.findMany({
      where: { profileId: profile.id },
      orderBy: [{ position: 'asc' }],
      select: { id: true, position: true, status: true, isPrimary: true },
    });
    if (existing.length >= PHOTO_MAX_COUNT) {
      throw new UnprocessableEntityException({
        error: 'photo_limit_reached',
        message: `Max ${PHOTO_MAX_COUNT} photos per profile.`,
      });
    }
    const approvedExists = existing.some((p) => p.status === UserProfilePhotoStatus.APPROVED);
    const nextPosition = existing.length
      ? Math.max(...existing.map((p) => p.position)) + 1
      : 0;

    const created = await this.prisma.userProfilePhoto.create({
      data: {
        profileId: profile.id,
        storageKey: 'pending://storage-key',
        originalFileName: file.originalname || null,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        position: nextPosition,
        status: UserProfilePhotoStatus.APPROVED, // Stub moderation: auto-approve.
        moderationProvider: 'stub',
        moderationResultJson: { decision: 'approved', reason: 'stub_auto_approve' },
        isPrimary: !approvedExists,
      },
    });

    try {
      const storageKey = this.photoStorage.buildStorageKey({
        profileId: profile.id,
        photoId: created.id,
        mimeType: file.mimetype,
        originalFileName: file.originalname,
      });
      await this.photoStorage.save(storageKey, file.buffer);
      const updated = await this.prisma.userProfilePhoto.update({
        where: { id: created.id },
        data: { storageKey },
      });
      if (!approvedExists) {
        await this.prisma.userProfilePhoto.updateMany({
          where: { profileId: profile.id, id: { not: created.id } },
          data: { isPrimary: false },
        });
      }
      return this.toPhotoDto(updated);
    } catch (e) {
      await this.prisma.userProfilePhoto
        .delete({ where: { id: created.id } })
        .catch(() => undefined);
      throw e;
    }
  }

  async deletePhotoForUser(
    userId: string,
    photoId: string,
  ): Promise<{ deleted: true }> {
    const profile = await this.requireProfileForUser(userId);
    const row = await this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this profile.',
      });
    }

    await this.prisma.userProfilePhoto.delete({ where: { id: row.id } });
    await this.photoStorage.delete(row.storageKey).catch(() => undefined);

    if (row.isPrimary) {
      const promote = await this.prisma.userProfilePhoto.findFirst({
        where: { profileId: profile.id, status: UserProfilePhotoStatus.APPROVED },
        orderBy: [{ position: 'asc' }],
      });
      if (promote) {
        await this.prisma.$transaction(async (tx) => {
          await tx.userProfilePhoto.updateMany({
            where: { profileId: profile.id },
            data: { isPrimary: false },
          });
          await tx.userProfilePhoto.update({
            where: { id: promote.id },
            data: { isPrimary: true },
          });
        });
      }
    }
    return { deleted: true };
  }

  async setPrimaryPhotoForUser(
    userId: string,
    photoId: string,
  ): Promise<MeProfilePhotoDto> {
    const profile = await this.requireProfileForUser(userId);
    const row = await this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this profile.',
      });
    }
    if (row.status !== UserProfilePhotoStatus.APPROVED) {
      throw new UnprocessableEntityException({
        error: 'photo_not_approved',
        message: 'Only approved photos can be set as primary.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userProfilePhoto.updateMany({
        where: { profileId: profile.id },
        data: { isPrimary: false },
      });
      return tx.userProfilePhoto.update({
        where: { id: row.id },
        data: { isPrimary: true },
      });
    });
    return this.toPhotoDto(updated);
  }

  async getPhotoFileForUser(
    userId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const profile = await this.requireProfileForUser(userId);
    const row = await this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
      select: { id: true, profileId: true, storageKey: true, mimeType: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this profile.',
      });
    }
    const content = await this.photoStorage.read(row.storageKey);
    if (!content) {
      throw new NotFoundException({
        error: 'photo_file_not_found',
        message: 'Photo file is missing from local storage.',
      });
    }
    return { contentType: row.mimeType, content };
  }

  /**
   * Persists HG partner-preference fields to `UserProfilePreference` (normalized; Phase F).
   * Must use the same transaction client as the profile write so both tables commit or roll back together.
   */
  private async upsertPreference(
    tx: Prisma.TransactionClient,
    profileId: string,
    body: CreateMeProfileDto | PatchMeProfileDto,
  ): Promise<void> {
    const prefData = toPreferenceData(body);
    if (prefData.acceptedPartnerGenders === undefined) {
      const snap = await tx.userProfile.findUnique({
        where: { id: profileId },
        select: { desiredPartnerGenders: true },
      });
      prefData.acceptedPartnerGenders = acceptedPartnerGendersFromDesiredJson(
        snap?.desiredPartnerGenders ?? null,
      );
    }
    await tx.userProfilePreference.upsert({
      where: { profileId },
      create: {
        profileId,
        ...prefData,
      } as Prisma.UserProfilePreferenceUncheckedCreateInput,
      update: prefData as Prisma.UserProfilePreferenceUncheckedUpdateInput,
    });
  }

  async getForUser(userId: string): Promise<MeProfileResponseDto | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
    return row ? toResponse(row, row.preference) : null;
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

    if (!latest) {
      throw new NotFoundException({
        error: 'evaluation_not_found',
        message:
          'No analysis result exists for this profile yet. Submit your profile for analysis first.',
      });
    }

    this.obs.trace(
      `me profile latest analysis profileId=${profile.id} evaluationId=${latest.id}`,
      ErrorCodes.ME_PROFILE_ANALYSIS_LATEST_OK,
    );

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

    assertOnboardingStepCoherent(null, body);

    const createNickname =
      body.nickname !== undefined
        ? normalizeNicknameValue(body.nickname)
        : undefined;
    if (createNickname) {
      await this.assertNicknameAvailable(createNickname, null);
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const writable = toPrismaWritableData(body);
        if (body.gender === undefined) {
          writable.gender = ProfileGender.PREFER_NOT_TO_SAY;
        }
        applyOnboardingCompletionToWriteData(writable, body, null);
        const created = await tx.userProfile.create({
          data: {
            user: { connect: { id: userId } },
            status: UserProfileStatus.DRAFT,
            ...writable,
          } as Prisma.UserProfileCreateInput,
        });
        await this.upsertPreference(tx, created.id, body);
        return created;
      });
      this.obs.trace(
        `me profile created profileId=${row.id}`,
        ErrorCodes.ME_PROFILE_CREATE_SUCCESS,
      );
      const full = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { preference: true },
      });
      if (!full) {
        const ex = new InternalServerErrorException({
          message: 'Profile could not be loaded after create',
        });
        markHttpExceptionObservabilityLogged(ex);
        throw ex;
      }
      return toResponse(full, full.preference);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes('nickname')) {
          throw new ConflictException({
            error: 'nickname_taken',
            message: 'This nickname is already in use.',
          });
        }
      }
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
      include: { preference: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }

    assertOnboardingStepCoherent(existing, body);

    const data = toPrismaWritableData(body);
    if (body.nickname !== undefined) {
      const nextNickname = normalizeNicknameValue(body.nickname);
      const currentNickname = normalizeNicknameValue(existing.nickname);
      if (nextNickname === currentNickname) {
        delete data.nickname;
      } else if (nextNickname !== null) {
        await this.assertNicknameAvailable(nextNickname, existing.id);
      }
    }
    applyOnboardingCompletionToWriteData(
      data,
      body,
      existing.onboardingCompletedAt,
    );
    const prefDelta = toPreferenceData(body);
    const hasProfileFieldChanges = Object.keys(data).length > 0;
    const hasPrefChanges = Object.keys(prefDelta).length > 0;

    if (!hasProfileFieldChanges && !hasPrefChanges) {
      this.obs.trace(
        `me profile patched (no field changes) profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_PATCH_SUCCESS,
      );
      return toResponse(existing, existing.preference);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (hasProfileFieldChanges) {
          await tx.userProfile.update({
            where: { userId },
            data,
          });
        }
        await this.upsertPreference(tx, existing.id, body);
      });
      const full = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { preference: true },
      });
      if (!full) {
        const ex = new InternalServerErrorException({
          message: 'Profile could not be loaded after patch',
        });
        markHttpExceptionObservabilityLogged(ex);
        throw ex;
      }
      this.obs.trace(
        `me profile patched profileId=${full.id}`,
        ErrorCodes.ME_PROFILE_PATCH_SUCCESS,
      );
      return toResponse(full, full.preference);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes('nickname')) {
          throw new ConflictException({
            error: 'nickname_taken',
            message: 'This nickname is already in use.',
          });
        }
      }
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

    if (
      !existing.gender ||
      existing.gender === ProfileGender.PREFER_NOT_TO_SAY
    ) {
      this.obs.error(
        `me profile submit rejected: gender not chosen profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE,
      );
      const ex = new UnprocessableEntityException({
        error: 'gender_required',
        message:
          'Choose a gender (other than prefer-not-to-say) before submitting the profile for analysis.',
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

      const full = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { preference: true },
      });
      if (!full) {
        const ex = new InternalServerErrorException({
          message: 'Profile could not be loaded after submit',
        });
        markHttpExceptionObservabilityLogged(ex);
        throw ex;
      }
      return toResponse(full, full.preference);
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
