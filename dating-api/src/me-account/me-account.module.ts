import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { MeProfileValidationPipe } from '../me-profile/me-profile-validation.pipe';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { MeAccountController } from './me-account.controller';
import { MeAccountService } from './me-account.service';
import { ACCOUNT_REPOSITORY } from './repositories/account.repository';
import { PrismaAccountRepository } from './repositories/prisma-account.repository';

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    UsersModule,
    StructuredLoggingModule,
    AnalyticsModule,
    PhotoStorageModule,
    MessagingSocketRegistryModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [MeAccountController],
  providers: [
    MeAccountService,
    MeProfileValidationPipe,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountRepository,
    },
  ],
})
export class MeAccountModule {}
