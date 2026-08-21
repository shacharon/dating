import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import type { RedisClientHandle } from './cache.ports';

@Injectable()
export class RedisConnectionProvider
  implements OnModuleInit, OnModuleDestroy, RedisClientHandle
{
  private readonly logger = new Logger(RedisConnectionProvider.name);
  private client: RedisClientType | null = null;
  private available = false;
  private urlConfigured = false;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn(
        'REDIS_URL unset — Redis cache connection disabled (fail-open to DB)',
      );
      this.urlConfigured = false;
      return;
    }
    this.urlConfigured = true;
    const client = createClient({ url });
    client.on('error', (err) => {
      this.logger.warn(`Redis cache client error: ${String(err)}`);
    });
    try {
      await client.connect();
      this.client = client as RedisClientType;
      this.available = true;
      this.logger.log('Redis cache connected');
    } catch (err) {
      this.logger.warn(
        `Redis cache connect failed — fail-open to DB: ${err instanceof Error ? err.message : String(err)}`,
      );
      try {
        await client.quit();
      } catch {
        /* ignore */
      }
      this.client = null;
      this.available = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
    this.client = null;
    this.available = false;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isAvailable(): boolean {
    return this.available && this.client != null;
  }

  isUrlConfigured(): boolean {
    return this.urlConfigured;
  }
}
