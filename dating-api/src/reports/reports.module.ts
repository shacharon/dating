import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { MeProfileValidationPipe } from '../me-profile/me-profile-validation.pipe';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    UsersModule,
    StructuredLoggingModule,
    NotificationsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, MeProfileValidationPipe],
})
export class ReportsModule {}
