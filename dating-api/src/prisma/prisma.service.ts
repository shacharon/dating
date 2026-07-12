import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

interface PrismaLifecycleClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
  }

  async onModuleInit(): Promise<void> {
    const client = this as unknown as PrismaLifecycleClient;
    await client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    const client = this as unknown as PrismaLifecycleClient;
    await client.$disconnect();
  }
}
