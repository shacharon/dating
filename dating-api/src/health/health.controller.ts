import { Controller, Get } from '@nestjs/common';
import {
  MessagingRealtimeHealthService,
  type RealtimeHealthSnapshot,
} from '../messaging-realtime/messaging-realtime-health.service';

@Controller()
export class HealthController {
  constructor(
    private readonly messagingRealtimeHealth: MessagingRealtimeHealthService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, service: 'dating-api', ts: new Date().toISOString() };
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
