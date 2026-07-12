import { AnalyticsService } from './analytics.service';
import type { AnalyticsProvider } from './analytics-provider.interface';
import { ProductAnalyticsEvents } from './product-analytics.events';

describe('AnalyticsService', () => {
  const prevEnabled = process.env.PRODUCT_ANALYTICS_ENABLED;

  afterEach(() => {
    if (prevEnabled === undefined) {
      delete process.env.PRODUCT_ANALYTICS_ENABLED;
    } else {
      process.env.PRODUCT_ANALYTICS_ENABLED = prevEnabled;
    }
  });

  it('calls provider when enabled', () => {
    delete process.env.PRODUCT_ANALYTICS_ENABLED;
    const provider: AnalyticsProvider = { capture: jest.fn() };
    const service = new AnalyticsService(provider);

    service.track('user_1', ProductAnalyticsEvents.MATCH_ACTION, {
      action: 'like',
      candidateProfileId: 'prof_1',
    });

    expect(provider.capture).toHaveBeenCalledWith(
      ProductAnalyticsEvents.MATCH_ACTION,
      'user_1',
      { action: 'like', candidateProfileId: 'prof_1' },
    );
  });

  it('does not call provider when PRODUCT_ANALYTICS_ENABLED=false', () => {
    process.env.PRODUCT_ANALYTICS_ENABLED = 'false';
    const provider: AnalyticsProvider = { capture: jest.fn() };
    const service = new AnalyticsService(provider);

    service.track('user_1', ProductAnalyticsEvents.MATCH_ACTION, {
      action: 'like',
      candidateProfileId: 'prof_1',
    });

    expect(provider.capture).not.toHaveBeenCalled();
  });

  it('does not throw when provider throws', () => {
    delete process.env.PRODUCT_ANALYTICS_ENABLED;
    const provider: AnalyticsProvider = {
      capture: () => {
        throw new Error('sink down');
      },
    };
    const service = new AnalyticsService(provider);

    expect(() =>
      service.track('user_1', ProductAnalyticsEvents.MESSAGE_SENT, {
        conversationIdHash: 'abc',
      }),
    ).not.toThrow();
  });
});
