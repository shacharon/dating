import { Injectable } from '@nestjs/common';
import { isProductionEnv } from '../config/is-production-env';
import { isMessagingRedisAdapterBound } from '../messaging-realtime/messaging-realtime-redis-state';
import { PrismaService } from '../prisma/prisma.service';

export type HealthCheckStatus = 'ok' | 'failed';

export type ReadinessPayload = {
  ok: boolean;
  service: string;
  ts: string;
  checks: {
    database: HealthCheckStatus;
    redisAdapter: HealthCheckStatus;
  };
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadiness(): Promise<ReadinessPayload> {
    const database = await this.pingDatabase();
    const redisAdapter =
      !isProductionEnv() || isMessagingRedisAdapterBound() ? 'ok' : 'failed';
    const ok = database === 'ok' && redisAdapter === 'ok';

    return {
      ok,
      service: 'dating-api',
      ts: new Date().toISOString(),
      checks: { database, redisAdapter },
    };
  }

  private async pingDatabase(): Promise<HealthCheckStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'failed';
    }
  }
}
