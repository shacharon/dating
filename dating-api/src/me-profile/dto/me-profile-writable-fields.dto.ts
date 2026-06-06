import { ProfileGender, UserProfileOnboardingStep } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
} from 'class-validator';
import {
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  SIMILARITY_PREFERENCE_VALUES,
  SmokingFrequencySelf,
  WantsChildrenSelf,
  AcceptedPartnerAlcohol,
  AcceptedPartnerSmoking,
} from '../../canonical/matching-canonical.types';
import { BirthDateNotFutureConstraint } from '../validators/birth-date-not-future.constraint';
import { PartnerAgeRangeConstraint } from '../validators/partner-age-range.constraint';

/**
 * Fields the client may set on POST/PATCH `/api/v1/me/profile`.
 * `id`, `userId`, and `status` are never defined here (rejected by `forbidNonWhitelisted`).
 */
export class MeProfileWritableFieldsDto {
  @IsOptional()
  @IsString()
  aboutMe?: string | null;

  @IsOptional()
  @IsString()
  aboutPartner?: string | null;

  @IsOptional()
  @IsString()
  aboutRelationship?: string | null;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'birthDate must be a valid ISO 8601 date string' },
  )
  @Validate(BirthDateNotFutureConstraint)
  birthDate?: string | null;

  @IsOptional()
  @IsEnum(ProfileGender, {
    message: 'gender must be a ProfileGender enum value',
  })
  gender?: ProfileGender | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsArray()
  @ArrayNotEmpty({
    message:
      'desiredPartnerGenders must be a non-empty array when provided',
  })
  @IsEnum(ProfileGender, {
    each: true,
    message:
      'each desiredPartnerGenders value must be a ProfileGender enum value',
  })
  desiredPartnerGenders?: ProfileGender[] | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @IsString()
  locationLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(80, { message: 'nickname must be at most 80 characters' })
  nickname?: string | null;

  @IsOptional()
  @IsEnum(UserProfileOnboardingStep, {
    message:
      'onboardingStep must be a UserProfileOnboardingStep value (BASIC, TEXTS, COMPLETED)',
  })
  onboardingStep?: UserProfileOnboardingStep;

  // ── Holy Grail structured facts (self) ──────────────────────────────────────

  @IsOptional()
  @IsEnum(ChildrenStatusSelf)
  childrenStatus?: ChildrenStatusSelf | null;

  @IsOptional()
  @IsEnum(WantsChildrenSelf)
  wantsChildren?: WantsChildrenSelf | null;

  @IsOptional()
  @IsEnum(SmokingFrequencySelf)
  smokingFrequency?: SmokingFrequencySelf | null;

  @IsOptional()
  @IsEnum(AlcoholUseSelf)
  alcoholUse?: AlcoholUseSelf | null;

  @IsOptional()
  @IsEnum(EducationLevelSelf)
  education?: EducationLevelSelf | null;

  @IsOptional()
  @IsEnum(ReligionSelf)
  religion?: ReligionSelf | null;

  // ── Holy Grail structured preferences (partner requirements) ─────────────────

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  partnerAgeMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  @Validate(PartnerAgeRangeConstraint)
  partnerAgeMax?: number | null;

  @IsOptional()
  @IsEnum(MinimumPartnerEducation)
  minimumPartnerEducation?: MinimumPartnerEducation | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsArray()
  @IsEnum(AcceptedPartnerSmoking, { each: true })
  acceptedPartnerSmoking?: AcceptedPartnerSmoking[];

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsArray()
  @IsEnum(AcceptedPartnerAlcohol, { each: true })
  acceptedPartnerAlcohol?: AcceptedPartnerAlcohol[];

  @IsOptional()
  @IsEnum(PartnerWantsChildrenRequirement)
  partnerWantsChildren?: PartnerWantsChildrenRequirement | null;

  @IsOptional()
  @IsEnum(PartnerHasChildrenAcceptance)
  partnerHasChildren?: PartnerHasChildrenAcceptance | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsArray()
  @IsEnum(ReligionSelf, { each: true })
  acceptedPartnerReligions?: ReligionSelf[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxDistanceKm?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(SIMILARITY_PREFERENCE_VALUES)
  similarityPreference?: (typeof SIMILARITY_PREFERENCE_VALUES)[number] | null;
}
