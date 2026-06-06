import { Injectable } from '@nestjs/common';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import {
  MESSAGING_WS_NAMESPACE,
  MESSAGING_SOCKET_IO_PATH,
} from './messaging-realtime.constants';
import { isMessagingRedisAdapterBound } from './messaging-realtime-redis-state';
import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';

export type RealtimeHealthSnapshot = {
  namespace: string;
  socketIoPath: string;
  redisAdapter: boolean;
  /** True when inbound WS rate limit uses Redis (not in-memory fallback). */
  wsRateLimitRedis: boolean;
  sessionCookieName: string;
};

@Injectable()
export class MessagingRealtimeHealthService {
  constructor(
    private readonly authSessionConfig: AuthSessionConfigService,
    private readonly wsRateLimit: MessagingWsRateLimitService,
  ) {}

  getSnapshot(): RealtimeHealthSnapshot {
    return {
      namespace: MESSAGING_WS_NAMESPACE,
      socketIoPath: MESSAGING_SOCKET_IO_PATH,
      redisAdapter: isMessagingRedisAdapterBound(),
      wsRateLimitRedis: this.wsRateLimit.isUsingRedisStore(),
      sessionCookieName: this.authSessionConfig.sessionCookieName,
    };
  }
}
