import { Global, Module } from '@nestjs/common';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { ANALYTICS_PROVIDER } from './analytics-provider.interface';
import { AnalyticsService } from './analytics.service';
import { StructuredLogAnalyticsProvider } from './structured-log-analytics.provider';

// v2: if (POSTHOG_API_KEY) register PostHogAnalyticsProvider as composite or replace.

@Global()
@Module({
  imports: [SimpleLoggerModule],
  providers: [
    StructuredLogAnalyticsProvider,
    {
      provide: ANALYTICS_PROVIDER,
      useExisting: StructuredLogAnalyticsProvider,
    },
    AnalyticsService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
