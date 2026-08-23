import { Injectable } from '@nestjs/common';
import { createFixedWindowRateLimitStoreProvider } from '../cache/rate-limit';
import {
  AUTH_REFRESH_RATE_LIMIT_MAX_PER_WINDOW,
  AUTH_REFRESH_RATE_LIMIT_WINDOW_MS,
  authRefreshRateLimitRedisKey,
} from './auth-rate-limit.constants';
import { AuthRefreshRateLimitExceededError } from './auth-refresh-rate-limit.error';

const AuthRefreshRateLimitStoreProviderBase =
  createFixedWindowRateLimitStoreProvider({
    config: {
      maxPerWindow: AUTH_REFRESH_RATE_LIMIT_MAX_PER_WINDOW,
      windowMs: AUTH_REFRESH_RATE_LIMIT_WINDOW_MS,
      redisKeyForUser: authRefreshRateLimitRedisKey,
      redisKeyScanPattern: 'auth:refresh:ratelimit:*',
    },
    createExceeded: () => new AuthRefreshRateLimitExceededError(),
    isExceededError: (e) => e instanceof AuthRefreshRateLimitExceededError,
    redisDegradedEvent: 'auth_refresh_rate_limit_redis_degraded',
    redisConnectFailedEvent: 'auth_refresh_rate_limit_redis_connect_failed',
    providerName: 'AuthRefreshRateLimitStoreProvider',
  });

@Injectable()
export class AuthRefreshRateLimitStoreProvider extends AuthRefreshRateLimitStoreProviderBase {}
