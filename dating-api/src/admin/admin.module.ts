import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { MeProfileModule } from '../me-profile/me-profile.module';
import { MeProfileValidationPipe } from '../me-profile/me-profile-validation.pipe';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { WorkerModule } from '../workers/worker.module';
import { AdminAuthModule } from './admin-auth.module';
import { AdminContentViolationsController } from './admin-content-violations/admin-content-violations.controller';
import { AdminContentViolationsService } from './admin-content-violations/admin-content-violations.service';
import { AdminPhotosController } from './admin-photos/admin-photos.controller';
import { AdminPhotosService } from './admin-photos/admin-photos.service';
import { AdminMatchQualityController } from './admin-match-quality/admin-match-quality.controller';
import { AdminMatchQualityService } from './admin-match-quality/admin-match-quality.service';
import { AdminReportsController } from './admin-reports/admin-reports.controller';
import { AdminReportsService } from './admin-reports/admin-reports.service';

@Module({
  imports: [
    PrismaModule,
    PhotoStorageModule,
    NotificationsModule,
    forwardRef(() => WorkerModule),
    SessionModule,
    UsersModule,
    forwardRef(() => AuthModule),
    MeProfileModule,
    AdminAuthModule,
    ContentModerationModule,
  ],
  controllers: [
    AdminPhotosController,
    AdminReportsController,
    AdminMatchQualityController,
    AdminContentViolationsController,
  ],
  providers: [
    AdminPhotosService,
    AdminReportsService,
    AdminMatchQualityService,
    AdminContentViolationsService,
    MeProfileValidationPipe,
  ],
  exports: [AdminAuthModule],
})
export class AdminModule {}
