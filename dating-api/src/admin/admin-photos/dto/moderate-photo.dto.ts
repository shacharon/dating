import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PhotoModerationDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ModeratePhotoDto {
  @IsEnum(PhotoModerationDecision)
  decision!: PhotoModerationDecision;

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
  isPrimary!: boolean;
  updatedAt!: string;
}
