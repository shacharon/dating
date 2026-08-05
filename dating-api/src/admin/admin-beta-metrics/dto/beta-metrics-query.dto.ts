import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BetaMetricsQueryDto {
  /** ISO date or datetime for sign-ups window start. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  betaStart?: string;
}
