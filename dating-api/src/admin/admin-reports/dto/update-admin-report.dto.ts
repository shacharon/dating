import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AdminReportResolutionStatus {
  DISMISSED = 'DISMISSED',
  ACTION_TAKEN = 'ACTION_TAKEN',
}

export class UpdateAdminReportDto {
  @IsEnum(AdminReportResolutionStatus)
  status!: AdminReportResolutionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  opsNote?: string;
}
