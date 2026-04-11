import { ProfileGender } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidateIf,
} from 'class-validator';
import { BirthDateNotFutureConstraint } from '../validators/birth-date-not-future.constraint';

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
  @IsInt()
  @Min(1)
  onboardingStep?: number;
}
