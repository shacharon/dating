import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsModule } from '../analytics/analytics.module';
import { JwtAuthConfigModule } from '../config/jwt-auth-config.module';
import { JwtAuthConfigService } from '../config/jwt-auth-config.service';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { ApiV1AuthController } from './api-v1-auth.controller';
import { AuthCredentialsService } from './auth-credentials.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { OptionalAuthGuard } from './optional-auth.guard';
import { ReferralAttributionService } from './referral-attribution.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [JwtAuthConfigModule],
      inject: [JwtAuthConfigService],
      useFactory: (cfg: JwtAuthConfigService) => ({
        secret: cfg.jwtSecret ?? 'jwt-unconfigured',
      }),
    }),
    JwtAuthConfigModule,
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
    TokenService,
    RefreshTokenRepository,
    AuthCredentialsService,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [
    AuthService,
    GoogleAuthService,
    TokenService,
    AuthCredentialsService,
    AuthGuard,
    OptionalAuthGuard,
    SessionModule,
    UsersModule,
  ],
})
export class AuthModule {}
