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
import { MessagingWsSessionService } from './messaging-ws-session.service';
import { MessagingRealtimeHealthService } from './messaging-realtime-health.service';
import { RealtimePublisher } from './realtime-publisher.service';

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
    MessagingWsRateLimitService,
    MessagingWsSessionService,
    RealtimePublisher,
    MessagingRealtimeHealthService,
  ],
  exports: [RealtimePublisher, MessagingRealtimeHealthService],
})
export class MessagingRealtimeModule {}
