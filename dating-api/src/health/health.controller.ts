import {
  Controller,
  Get,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MessagingRealtimeHealthService,
  type RealtimeHealthSnapshot,
} from '../messaging-realtime/messaging-realtime-health.service';
import { SentryConfigService } from '../observability/sentry-config.service';
import { HealthService, type ReadinessPayload } from './health.service';

@Controller()
export class HealthController {
  constructor(
    private readonly messagingRealtimeHealth: MessagingRealtimeHealthService,
    private readonly sentryConfig: SentryConfigService,
    private readonly healthService: HealthService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, service: 'dating-api', ts: new Date().toISOString() };
  }

  /**
   * Readiness: DB ping + (in production) Redis socket.io adapter bound.
   * Keep `/health` as shallow liveness for ALB / k8s.
   */
  @Get('health/ready')
  async ready(): Promise<ReadinessPayload> {
    const result = await this.healthService.getReadiness();
    if (!result.ok) {
      throw new ServiceUnavailableException(result);
    }
    return result;
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
