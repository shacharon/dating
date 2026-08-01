import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { ApiV1AuthController } from './api-v1-auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { OptionalAuthGuard } from './optional-auth.guard';
import { ReferralAttributionService } from './referral-attribution.service';

@Module({
  imports: [
    SessionModule,
    UsersModule,
    MessagingSocketRegistryModule,
    AnalyticsModule,
  ],
  controllers: [ApiV1AuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    ReferralAttributionService,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [
    AuthService,
    GoogleAuthService,
    AuthGuard,
    OptionalAuthGuard,
    // Re-export so @UseGuards(AuthGuard) in consumer modules can resolve SessionService / UsersService
    SessionModule,
    UsersModule,
  ],
})
export class AuthModule {}
