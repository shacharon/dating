import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { recordPrismaPoolConfigMissing } from '../observability/custom-metrics';
import { databaseUrlHasConnectionLimit } from './prisma-pool.helpers';

interface PrismaLifecycleClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly datasourceUrl: string;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL')?.trim();
    if (!url) {
      throw new Error(
        'DATABASE_URL is missing or empty. Create dating-api/.env with DATABASE_URL.',
      );
    }
    process.env.DATABASE_URL = url;
    // Keep `datasourceUrl` explicit. Stay on Prisma 6.19.x — Prisma 7.x has had Nest/runtime init bugs
    // (`path.resolve(..., undefined)` in getPrismaClient). Package.json pins `@prisma/client` + `prisma`.
    super({ datasourceUrl: url });
    this.datasourceUrl = url;
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
