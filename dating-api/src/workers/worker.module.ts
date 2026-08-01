import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MeProfileModule } from '../me-profile/me-profile.module';
import { ProfileAnalysisQueueService } from './profile-analysis.worker';
import { PhotoModerationQueueService } from './photo-moderation.worker';
import { MatchListRankQueueService } from './match-list-rank.worker';
import { PhotoSlaEnforcer } from './photo-sla.cron';

@Module({
  imports: [
    PrismaModule,
    PhotoStorageModule,
    NotificationsModule,
    forwardRef(() => MeProfileModule),
  ],
  providers: [
    PhotoModerationService,
    ProfileAnalysisQueueService,
    PhotoModerationQueueService,
    MatchListRankQueueService,
    PhotoSlaEnforcer,
  ],
  exports: [
    ProfileAnalysisQueueService,
    PhotoModerationQueueService,
    MatchListRankQueueService,
    PhotoModerationService,
  ],
})
export class WorkerModule {}
