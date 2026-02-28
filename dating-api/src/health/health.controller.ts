import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, service: 'dating-api', ts: new Date().toISOString() };
  }
}
