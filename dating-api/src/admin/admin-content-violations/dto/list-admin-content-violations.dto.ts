import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAdminContentViolationsQueryDto {
  @IsOptional()
  @IsString()
  surface?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export type AdminContentViolationListItemDto = {
  id: string;
  userId: string;
  userEmail: string;
  userNickname: string | null;
  userStatus: string;
  userMutedUntil: string | null;
  surface: string;
  category: string;
  flaggedTextPreview: string;
  score: number | null;
  action: string;
  createdAt: string;
};

export type ListAdminContentViolationsResponseDto = {
  violations: AdminContentViolationListItemDto[];
  total: number;
  limit: number;
  offset: number;
};
