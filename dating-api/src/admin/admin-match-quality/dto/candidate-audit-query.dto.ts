import { IsOptional, IsString, MinLength } from 'class-validator';
import { MatchQualityWindowQueryDto } from './match-quality-window-query.dto';

export class CandidateAuditQueryDto extends MatchQualityWindowQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  viewerUserId?: string;
}
