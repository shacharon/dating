import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListAdminBlockedUsersQueryDto {
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

export type AdminBlockedUserLatestViolationDto = {
  id: string;
  surface: string;
  category: string;
  flaggedTextPreview: string;
  flaggedText: string;
  score: number | null;
  action: string;
  createdAt: string;
  conversationId: string | null;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientNickname: string | null;
};

export type AdminBlockedUserItemDto = {
  userId: string;
  userEmail: string;
  userNickname: string | null;
  userStatus: string;
  userMutedUntil: string | null;
  violationCount: number;
  latestViolation: AdminBlockedUserLatestViolationDto | null;
};

export type ListAdminBlockedUsersResponseDto = {
  users: AdminBlockedUserItemDto[];
  total: number;
  limit: number;
  offset: number;
};
