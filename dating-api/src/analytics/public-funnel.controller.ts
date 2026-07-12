import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ANONYMOUS_ANALYTICS_USER_ID } from './analytics.constants';
import { AnalyticsService } from './analytics.service';
import { ReferralLandingViewDto } from './dto/referral-landing-view.dto';
import { ProductAnalyticsEvents } from './product-analytics.events';

@Controller('api/v1/public/funnel')
export class PublicFunnelController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('referral-landing-view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  referralLandingView(@Body() body: ReferralLandingViewDto): void {
    this.analytics.track(
      ANONYMOUS_ANALYTICS_USER_ID,
      ProductAnalyticsEvents.REFERRAL_LANDING_VIEWED,
      { refPresent: body.refPresent },
    );
  }
}
