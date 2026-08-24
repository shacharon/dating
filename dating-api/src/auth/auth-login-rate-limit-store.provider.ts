import { Injectable } from '@nestjs/common';
import { createFixedWindowRateLimitStoreProvider } from '../cache/rate-limit';
import {
  AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW,
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  authLoginRateLimitRedisKey,
} from './auth-rate-limit.constants';
import { AuthLoginRateLimitExceededError } from './auth-login-rate-limit.error';

const AuthLoginRateLimitStoreProviderBase =
  createFixedWindowRateLimitStoreProvider({
    config: {
      maxPerWindow: AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW,
      windowMs: AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
      redisKeyForUser: authLoginRateLimitRedisKey,
      redisKeyScanPattern: 'auth:login:ratelimit:*',
    },
    createExceeded: () => new AuthLoginRateLimitExceededError(),
    isExceededError: (e) => e instanceof AuthLoginRateLimitExceededError,
    redisDegradedEvent: 'auth_login_rate_limit_redis_degraded',
    redisConnectFailedEvent: 'auth_login_rate_limit_redis_connect_failed',
    providerName: 'AuthLoginRateLimitStoreProvider',
  });

@Injectable()
export class AuthLoginRateLimitStoreProvider extends AuthLoginRateLimitStoreProviderBase {}
