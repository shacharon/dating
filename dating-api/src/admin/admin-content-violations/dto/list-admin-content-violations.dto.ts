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

  /** Exact match: `blocked` | `warned`. */
  @IsOptional()
  @IsString()
  action?: string;

  /** Exact match on user.contentViolationStatus. */
  @IsOptional()
  @IsString()
  userStatus?: string;

  /** Truthy when `1` / `true` / `yes` → recipientUserId not null. */
  @IsOptional()
  @IsString()
  hasRecipient?: string;

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

  /** Truthy when `1` or `true` (query string; no ValidationPipe on GET). */
  @IsOptional()
  @IsString()
  includeFullText?: string;
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
  /** Present only when includeFullText=true */
  flaggedText?: string;
  score: number | null;
  action: string;
  createdAt: string;
  conversationId: string | null;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientNickname: string | null;
};

export type ListAdminContentViolationsResponseDto = {
  violations: AdminContentViolationListItemDto[];
  total: number;
  limit: number;
  offset: number;
};

export function isIncludeFullTextQuery(raw: string | undefined): boolean {
  if (raw == null || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Same truthy rules as includeFullText. */
export function isHasRecipientQuery(raw: string | undefined): boolean {
  return isIncludeFullTextQuery(raw);
}
