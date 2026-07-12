import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MatchQualityWindowQueryDto } from './match-quality-window-query.dto';

export class ListNegativeCandidatesQueryDto extends MatchQualityWindowQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  offset?: number = 0;
}
