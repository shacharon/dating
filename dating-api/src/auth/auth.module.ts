import { Module } from '@nestjs/common';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { ApiV1AuthController } from './api-v1-auth.controller';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthVerifier } from './google-oauth.verifier';
import { OptionalAuthGuard } from './optional-auth.guard';

@Module({
  imports: [SessionModule, UsersModule],
  controllers: [AuthController, ApiV1AuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    GoogleOAuthVerifier,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [
    AuthService,
    GoogleAuthService,
    AuthGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
