import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  recordPrismaPoolConfigMissing,
  recordPrismaSlowQueryMs,
} from '../observability/custom-metrics';
import { databaseUrlHasConnectionLimit } from './prisma-pool.helpers';
import {
  buildPrismaSlowQueryPayload,
  isPrismaSlowQueryReportingEnabled,
  resolvePrismaSlowQueryThresholds,
  severityForPrismaQueryDuration,
  shouldIncludePrismaQueryParams,
  type PrismaSlowQueryThresholds,
} from './prisma-slow-query';

interface PrismaLifecycleClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

type PrismaClientWithQueryEvents = PrismaClient & {
  $on(eventType: 'query', callback: (event: Prisma.QueryEvent) => void): void;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly datasourceUrl: string;

  constructor(
    config: ConfigService,
    private readonly obs: StructuredObservabilityService,
  ) {
    const url = config.get<string>('DATABASE_URL')?.trim();
    if (!url) {
      throw new Error(
        'DATABASE_URL is missing or empty. Create dating-api/.env with DATABASE_URL.',
      );
    }
    process.env.DATABASE_URL = url;
    const slowQueryEnabled = isPrismaSlowQueryReportingEnabled(process.env);
    // Keep `datasourceUrl` explicit. Stay on Prisma 6.19.x — Prisma 7.x has had Nest/runtime init bugs
    // (`path.resolve(..., undefined)` in getPrismaClient). Package.json pins `@prisma/client` + `prisma`.
    super({
      datasourceUrl: url,
      ...(slowQueryEnabled
        ? { log: [{ emit: 'event' as const, level: 'query' as const }] }
        : {}),
    });
    this.datasourceUrl = url;
    if (slowQueryEnabled) {
      this.registerSlowQueryListener();
    }
  }

  async onModuleInit(): Promise<void> {
    const client = this as unknown as PrismaLifecycleClient;
    await client.$connect();
    this.warnIfProductionPoolConfigMissing();
  }

  async onModuleDestroy(): Promise<void> {
    const client = this as unknown as PrismaLifecycleClient;
    await client.$disconnect();
  }

  /** Sprint 40 — fail-open slow-query listener (constructor after super). */
  private registerSlowQueryListener(): void {
    const thresholds = resolvePrismaSlowQueryThresholds(process.env);
    const includeParams = shouldIncludePrismaQueryParams(process.env);
    const client = this as unknown as PrismaClientWithQueryEvents;
    client.$on('query', (event) => {
      try {
        this.emitSlowQueryIfNeeded(event, thresholds, includeParams);
      } catch {
        /* never throw into Prisma engine path */
      }
    });
  }

  private emitSlowQueryIfNeeded(
    event: Prisma.QueryEvent,
    thresholds: PrismaSlowQueryThresholds,
    includeParams: boolean,
  ): void {
    const severity = severityForPrismaQueryDuration(
      event.duration,
      thresholds,
    );
    if (!severity) return;

    const payload = buildPrismaSlowQueryPayload(event, severity, {
      includeParams,
    });
    const message = JSON.stringify(payload);
    recordPrismaSlowQueryMs(event.duration, severity);

    if (severity === 'very_slow') {
      this.obs.error(message, ErrorCodes.PRISMA_VERY_SLOW_QUERY, undefined, {
        includeStack: false,
      });
      return;
    }
    this.obs.trace(message, ErrorCodes.PRISMA_SLOW_QUERY);
  }

  /** Sprint 39 — production only; never fails boot. */
  private warnIfProductionPoolConfigMissing(): void {
    if (process.env.NODE_ENV !== 'production') return;
    if (databaseUrlHasConnectionLimit(this.datasourceUrl)) return;
    recordPrismaPoolConfigMissing();
    this.logger.warn(
      'DATABASE_URL missing connection_limit in production — bake pool params before multi-task ECS. See docs/ops/PRISMA_CONNECTION_POOL.md',
    );
  }
}
