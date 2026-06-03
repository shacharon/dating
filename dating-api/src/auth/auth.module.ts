import { Module } from '@nestjs/common';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { ApiV1AuthController } from './api-v1-auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { OptionalAuthGuard } from './optional-auth.guard';

@Module({
  imports: [SessionModule, UsersModule, MessagingSocketRegistryModule],
  controllers: [ApiV1AuthController],
  providers: [AuthService, GoogleAuthService, AuthGuard, OptionalAuthGuard],
  exports: [AuthService, GoogleAuthService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
