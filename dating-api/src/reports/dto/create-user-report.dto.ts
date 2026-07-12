import {
  UserReportContextType,
  UserReportReason,
  UserReportStatus,
} from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserReportDto {
  @IsEnum(UserReportReason)
  reason!: UserReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string | null;

  @IsEnum(UserReportContextType)
  contextType!: UserReportContextType;

  @IsString()
  @IsNotEmpty()
  contextId!: string;
}

export class UserReportResponseDto {
  id!: string;
  reason!: UserReportReason;
  status!: UserReportStatus;
  createdAt!: string;
  contextType!: UserReportContextType;
  contextId!: string;
}
