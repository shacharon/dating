import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { ANONYMOUS_ANALYTICS_USER_ID } from './analytics.constants';
import { PublicFunnelController } from './public-funnel.controller';
import { ProductAnalyticsEvents } from './product-analytics.events';

describe('PublicFunnelController', () => {
  let controller: PublicFunnelController;
  const analytics = { track: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicFunnelController],
      providers: [{ provide: AnalyticsService, useValue: analytics }],
    }).compile();
    controller = module.get(PublicFunnelController);
  });

  it('tracks referral.landing_viewed with refPresent only', () => {
    controller.referralLandingView({ refPresent: true });
    expect(analytics.track).toHaveBeenCalledWith(
      ANONYMOUS_ANALYTICS_USER_ID,
      ProductAnalyticsEvents.REFERRAL_LANDING_VIEWED,
      { refPresent: true },
    );
    expect(analytics.track.mock.calls[0]?.[2]).toEqual({ refPresent: true });
  });

  it('tracks refPresent false without extra properties', () => {
    controller.referralLandingView({ refPresent: false });
    expect(analytics.track).toHaveBeenCalledWith(
      ANONYMOUS_ANALYTICS_USER_ID,
      ProductAnalyticsEvents.REFERRAL_LANDING_VIEWED,
      { refPresent: false },
    );
  });
});
