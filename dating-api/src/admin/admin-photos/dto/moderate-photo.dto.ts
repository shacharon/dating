import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RejectionReasonCode } from '../../../photo-storage/photo-moderation.types';

export enum PhotoModerationDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum PhotoRejectionReasonCodeDto {
  NO_FACE = 'no_face',
  EXPLICIT_CONTENT = 'explicit_content',
  LOW_QUALITY = 'low_quality',
  NOT_REAL_PERSON = 'not_real_person',
  OTHER = 'other',
}

export class ModeratePhotoDto {
  @IsEnum(PhotoModerationDecision)
  decision!: PhotoModerationDecision;

  @IsOptional()
  @IsEnum(PhotoRejectionReasonCodeDto)
  rejectionReasonCode?: PhotoRejectionReasonCodeDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectionReason?: string;
}

export class ModeratePhotoResponseDto {
  id!: string;
  profileId!: string;
  status!: string;
  rejectionReason!: string | null;
  rejectionReasonCode?: RejectionReasonCode | null;
  isPrimary!: boolean;
  updatedAt!: string;
}
