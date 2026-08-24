import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MeProfileModule } from '../me-profile/me-profile.module';
import { ProfileAnalysisQueueService } from './profile-analysis.worker';
import { PhotoModerationQueueService } from './photo-moderation.worker';
import { MatchListRankQueueService } from './match-list-rank.worker';
import { MATCH_LIST_RANK_QUEUE_PORT } from './match-list-rank.ports';
import { PushNotificationQueueService } from './push-notification.worker';
import { PUSH_NOTIFICATION_QUEUE_PORT } from './push-notification.ports';
import { PhotoSlaEnforcer } from './photo-sla.cron';
import { MuteExpiryEnforcer } from './mute-expiry.cron';

/**
 * Worker / Bull queues.
 *
 * Module-level `forwardRef(() => MeProfileModule)` is intentional (Sprint 38 Story 2):
 * ProfileAnalysisQueueService still constructor-injects MeProfileAnalysisService +
 * MeMatchesService. Service-level MeMatches ↔ MatchListRankQueue cycle is broken via
 * MATCH_LIST_RANK_*_PORT + ModuleRef — do not reintroduce forwardRef on those classes.
 */
@Module({
  imports: [
    PrismaModule,
    PhotoStorageModule,
    NotificationsModule,
    MessagingSocketRegistryModule,
    ContentModerationModule,
    forwardRef(() => MeProfileModule),
  ],
  providers: [
    PhotoModerationService,
    ProfileAnalysisQueueService,
    PhotoModerationQueueService,
    MatchListRankQueueService,
    {
      provide: MATCH_LIST_RANK_QUEUE_PORT,
      useExisting: MatchListRankQueueService,
    },
    PushNotificationQueueService,
    {
      provide: PUSH_NOTIFICATION_QUEUE_PORT,
      useExisting: PushNotificationQueueService,
    },
    PhotoSlaEnforcer,
    MuteExpiryEnforcer,
  ],
  exports: [
    ProfileAnalysisQueueService,
    PhotoModerationQueueService,
    MatchListRankQueueService,
    MATCH_LIST_RANK_QUEUE_PORT,
    PushNotificationQueueService,
    PUSH_NOTIFICATION_QUEUE_PORT,
    PhotoModerationService,
  ],
})
export class WorkerModule {}
