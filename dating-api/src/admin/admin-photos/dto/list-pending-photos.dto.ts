import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListPendingPhotosQueryDto {
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

export type PendingPhotoListItemDto = {
  id: string;
  profileId: string;
  userId: string;
  createdAt: string;
  mimeType: string;
  originalFileName: string | null;
  fileUrl: string;
  status: 'PENDING' | 'FLAGGED_FOR_REVIEW';
  mlConfidence: number | null;
  mlLabels: string[];
  moderationProvider: string | null;
};

export type ListPendingPhotosResponseDto = {
  items: PendingPhotoListItemDto[];
  nextCursor: string | null;
};
