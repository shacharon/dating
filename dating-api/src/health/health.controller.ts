import { Controller, Get, NotFoundException } from '@nestjs/common';
import {
  MessagingRealtimeHealthService,
  type RealtimeHealthSnapshot,
} from '../messaging-realtime/messaging-realtime-health.service';
import { SentryConfigService } from '../observability/sentry-config.service';

@Controller()
export class HealthController {
  constructor(
    private readonly messagingRealtimeHealth: MessagingRealtimeHealthService,
    private readonly sentryConfig: SentryConfigService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, service: 'dating-api', ts: new Date().toISOString() };
  }

  /** Manual Sentry smoke — disabled in production unless ENABLE_SENTRY_TEST=1. */
  @Get('health/sentry-test')
  sentryTest(): never {
    if (!this.sentryConfig.sentryTestRouteEnabled) {
      throw new NotFoundException();
    }
    throw new Error('Sentry test');
  }

  @Get('health/realtime')
  realtime(): {
    ok: true;
    service: string;
    ts: string;
    messaging: RealtimeHealthSnapshot;
  } {
    return {
      ok: true,
      service: 'dating-api',
      ts: new Date().toISOString(),
      messaging: this.messagingRealtimeHealth.getSnapshot(),
    };
  }
}
