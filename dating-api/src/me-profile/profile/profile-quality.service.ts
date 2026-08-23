import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileGender } from '@prisma/client';
import {
  ProfileQualityDto,
  type ProfileQualitySuggestionId,
} from '../dto/profile-quality.dto';
import { viewerHasApprovedPhoto } from './me-profile-photo-gate';
import { MeProfileService } from './me-profile.service';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../repositories/match.repository';

export const PROFILE_QUALITY_STORY_MIN_CHARS = 50;

export const PROFILE_QUALITY_POINTS = {
  nickname: 10,
  location: 10,
  basics: 10,
  aboutMe: 20,
  aboutPartner: 20,
  aboutRelationship: 15,
  photo: 15,
} as const;

/** Suggestion list order (missing only). */
export const PROFILE_QUALITY_SUGGESTION_ORDER: ProfileQualitySuggestionId[] = [
  'photo',
  'basics',
  'nickname',
  'location',
  'aboutMe',
  'aboutPartner',
  'aboutRelationship',
];

export type ProfileQualityInput = {
  nickname: string | null;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
  birthDate: Date | string | null;
  gender: ProfileGender | string | null;
  desiredPartnerGenders: ProfileGender[] | string[] | null;
  aboutMe: string | null;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  hasApprovedPhoto: boolean;
};

function nonEmpty(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function storyLongEnough(value: string | null | undefined): boolean {
  return (value?.trim().length ?? 0) >= PROFILE_QUALITY_STORY_MIN_CHARS;
}

function hasBasics(input: ProfileQualityInput): boolean {
  const gender = input.gender;
  const genders = input.desiredPartnerGenders ?? [];
  return (
    input.birthDate != null &&
    Boolean(gender) &&
    gender !== 'PREFER_NOT_TO_SAY' &&
    genders.length > 0
  );
}

/**
 * Pure scorer for unit tests and service.
 */
export function computeProfileQuality(
  input: ProfileQualityInput,
): ProfileQualityDto {
  const completeness = {
    hasNickname: nonEmpty(input.nickname),
    hasLocation:
      nonEmpty(input.city) ||
      nonEmpty(input.country) ||
      nonEmpty(input.locationLabel),
    hasBasics: hasBasics(input),
    hasAboutMe: storyLongEnough(input.aboutMe),
    hasAboutPartner: storyLongEnough(input.aboutPartner),
    hasAboutRelationship: storyLongEnough(input.aboutRelationship),
    hasApprovedPhoto: input.hasApprovedPhoto,
  };

  const passed: Record<ProfileQualitySuggestionId, boolean> = {
    nickname: completeness.hasNickname,
    location: completeness.hasLocation,
    basics: completeness.hasBasics,
    aboutMe: completeness.hasAboutMe,
    aboutPartner: completeness.hasAboutPartner,
    aboutRelationship: completeness.hasAboutRelationship,
    photo: completeness.hasApprovedPhoto,
  };

  let score = 0;
  for (const id of Object.keys(PROFILE_QUALITY_POINTS) as ProfileQualitySuggestionId[]) {
    if (passed[id]) {
      score += PROFILE_QUALITY_POINTS[id];
    }
  }

  const suggestions = PROFILE_QUALITY_SUGGESTION_ORDER.filter(
    (id) => !passed[id],
  ).map((id) => ({
    id,
    points: PROFILE_QUALITY_POINTS[id],
  }));

  return { score, completeness, suggestions };
}

@Injectable()
export class ProfileQualityService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY) private readonly matches: IMatchQueryRepository,
    private readonly meProfile: MeProfileService,
  ) {}

  async getForUser(userId: string): Promise<ProfileQualityDto> {
    const profile = await this.meProfile.getForUser(userId);
    if (!profile) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account yet. Use POST /api/v1/me/profile to create one.',
      });
    }

    const hasApprovedPhoto = await viewerHasApprovedPhoto(
      this.matches,
      profile.id,
    );

    return computeProfileQuality({
      nickname: profile.nickname,
      city: profile.city,
      country: profile.country,
      locationLabel: profile.locationLabel,
      birthDate: profile.birthDate,
      gender: profile.gender,
      desiredPartnerGenders: profile.desiredPartnerGenders,
      aboutMe: profile.aboutMe,
      aboutPartner: profile.aboutPartner,
      aboutRelationship: profile.aboutRelationship,
      hasApprovedPhoto,
    });
  }
}
