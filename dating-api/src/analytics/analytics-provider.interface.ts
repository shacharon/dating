import type {
  ProductAnalyticsEventName,
  ProductAnalyticsProperties,
} from './product-analytics.events';

export interface AnalyticsProvider {
  capture(
    event: ProductAnalyticsEventName,
    userId: string,
    properties: ProductAnalyticsProperties,
  ): void;
}

export const ANALYTICS_PROVIDER = Symbol('ANALYTICS_PROVIDER');
