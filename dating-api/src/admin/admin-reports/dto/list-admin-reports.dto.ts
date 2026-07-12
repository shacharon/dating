import { UserReportContextType, UserReportReason, UserReportStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAdminReportsQueryDto {
  @IsOptional()
  @IsEnum(UserReportStatus)
  status?: UserReportStatus = UserReportStatus.OPEN;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export type AdminReportListItemDto = {
  id: string;
  reason: UserReportReason;
  status: UserReportStatus;
  createdAt: string;
  reporterUserId: string;
  reportedUserId: string;
  contextType: UserReportContextType;
};

export type ListAdminReportsResponseDto = {
  items: AdminReportListItemDto[];
  nextCursor: string | null;
};
