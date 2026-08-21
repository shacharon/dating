import { Module, forwardRef } from '@nestjs/common';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { MeProfileModule } from '../me-profile/me-profile.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { MessagingGateway } from './messaging.gateway';
import { MessagingSocketRegistryModule } from './messaging-socket-registry.module';
import { MessagingWsAuthService } from './messaging-ws-auth.service';
import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';
import { WsRateLimitStoreProvider } from './messaging-ws-rate-limit-store.provider';
import { WS_RATE_LIMIT_STORE } from './messaging-ws-rate-limit.tokens';
import { MessagingWsSessionService } from './messaging-ws-session.service';
import { MessagingRealtimeHealthService } from './messaging-realtime-health.service';

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    UsersModule,
    AuthSessionConfigModule,
    StructuredLoggingModule,
    SimpleLoggerModule,
    MessagingSocketRegistryModule,
    forwardRef(() => MeProfileModule),
  ],
  providers: [
    MessagingGateway,
    MessagingWsAuthService,
    WsRateLimitStoreProvider,
    {
      provide: WS_RATE_LIMIT_STORE,
      useExisting: WsRateLimitStoreProvider,
    },
    MessagingWsRateLimitService,
    MessagingWsSessionService,
    MessagingRealtimeHealthService,
  ],
  exports: [MessagingSocketRegistryModule, MessagingRealtimeHealthService],
})
export class MessagingRealtimeModule {}
