import { Global, Module } from '@nestjs/common';
import {
  CACHE_KV,
  CACHE_SETS,
  CRON_LOCK,
  REDIS_CLIENT,
} from './cache.ports';
import { RedisCacheService } from './redis-cache.service';
import { RedisConnectionProvider } from './redis-connection.provider';

@Global()
@Module({
  providers: [
    RedisConnectionProvider,
    { provide: REDIS_CLIENT, useExisting: RedisConnectionProvider },
    RedisCacheService,
    { provide: CACHE_KV, useExisting: RedisCacheService },
    { provide: CACHE_SETS, useExisting: RedisCacheService },
    { provide: CRON_LOCK, useExisting: RedisCacheService },
  ],
  exports: [REDIS_CLIENT, CACHE_KV, CACHE_SETS, CRON_LOCK],
})
export class RedisCacheModule {}
