import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_PROVIDER,
  type AnalyticsProvider,
} from './analytics-provider.interface';
import { isProductAnalyticsEnabled } from './product-analytics-enabled';
import type {
  ProductAnalyticsEventName,
  ProductAnalyticsProperties,
} from './product-analytics.events';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_PROVIDER)
    private readonly provider: AnalyticsProvider,
  ) {}

  track(
    userId: string,
    event: ProductAnalyticsEventName,
    properties: ProductAnalyticsProperties,
  ): void {
    if (!isProductAnalyticsEnabled()) {
      return;
    }
    try {
      this.provider.capture(event, userId, properties);
    } catch {
      // Best-effort telemetry — never fail callers.
    }
  }
}
