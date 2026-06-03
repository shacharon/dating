import { Injectable } from '@nestjs/common';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import {
  MESSAGING_WS_NAMESPACE,
  MESSAGING_SOCKET_IO_PATH,
} from './messaging-realtime.constants';
import { isMessagingRedisAdapterBound } from './messaging-realtime-redis-state';

export type RealtimeHealthSnapshot = {
  namespace: string;
  socketIoPath: string;
  redisAdapter: boolean;
  sessionCookieName: string;
};

@Injectable()
export class MessagingRealtimeHealthService {
  constructor(private readonly authSessionConfig: AuthSessionConfigService) {}

  getSnapshot(): RealtimeHealthSnapshot {
    return {
      namespace: MESSAGING_WS_NAMESPACE,
      socketIoPath: MESSAGING_SOCKET_IO_PATH,
      redisAdapter: isMessagingRedisAdapterBound(),
      sessionCookieName: this.authSessionConfig.sessionCookieName,
    };
  }
}
