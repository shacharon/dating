import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min, Validate } from 'class-validator';
import { CompareWindowsConstraint } from '../validators/compare-windows.constraint';

export class MatchQualityCompareQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  @Validate(CompareWindowsConstraint)
  beforeDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  @Validate(CompareWindowsConstraint)
  afterDays?: number;

  @IsOptional()
  @IsISO8601()
  beforeStart?: string;

  @IsOptional()
  @IsISO8601()
  beforeEnd?: string;

  @IsOptional()
  @IsISO8601()
  afterStart?: string;

  @IsOptional()
  @IsISO8601()
  @Validate(CompareWindowsConstraint)
  afterEnd?: string;
}
