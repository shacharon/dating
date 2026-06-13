import { IsBoolean } from 'class-validator';

export class ReferralLandingViewDto {
  @IsBoolean()
  refPresent!: boolean;
}
