import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProfileGender, UserProfile, UserProfileStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateMeProfileDto,
  MeProfileResponseDto,
  PatchMeProfileDto,
} from './me-profile.dto';

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
    data.gender = body.gender;
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
  return data;
}

@Injectable()
export class MeProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string): Promise<MeProfileResponseDto | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    return row ? toResponse(row) : null;
  }

  async createForUser(
    userId: string,
    body: CreateMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException({
        error: 'profile_already_exists',
        message:
          'A profile already exists for this account. Use PATCH /api/v1/me/profile to update it.',
      });
    }

    const row = await this.prisma.userProfile.create({
      data: {
        user: { connect: { id: userId } },
        status: UserProfileStatus.DRAFT,
        ...toPrismaWritableData(body),
      } as Prisma.UserProfileCreateInput,
    });
    return toResponse(row);
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
      return toResponse(existing);
    }

    const row = await this.prisma.userProfile.update({
      where: { userId },
      data,
    });
    return toResponse(row);
  }
}
