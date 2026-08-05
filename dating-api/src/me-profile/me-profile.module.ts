import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagingRealtimeModule } from '../messaging-realtime/messaging-realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EvaluateServiceModule } from '../evaluate/evaluate-service.module';
import { LlmModule } from '../llm/llm.module';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { RedisCacheModule } from '../cache/redis-cache.module';
import { WorkerModule } from '../workers/worker.module';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import {
  MatchNarrativeCacheService,
  MatchNarrativeGenerator,
} from '../matches/match-narrative';
import {
  ConversationStarterCacheService,
  ConversationStarterGenerator,
  OpenerTrackingService,
} from '../matches/conversation-starter';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MeConversationMessagesService } from './me-conversation-messages.service';
import { MeConversationsService } from './me-conversations.service';
import { MeMatchActionsService } from './me-match-actions.service';
import { MeMatchFeedbackService } from './me-match-feedback.service';
import { MeMatchesService } from './me-matches.service';
import { MutualMatchesService } from './mutual-matches.service';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { MeProfileMatchesService } from './me-profile-matches.service';
import { MeProfileController } from './me-profile.controller';
import { MeProfileService } from './me-profile.service';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';
import { ProfileQualityService } from './profile-quality.service';
import { ProfileAnalysisSubmitService } from './profile/profile-analysis-submit.service';
import { ProfileCrudService } from './profile/profile-crud.service';
import { ProfileModerationService } from './profile/profile-moderation.service';
import { ProfilePhotoService } from './profile/profile-photo.service';
import { ProfilePreferenceService } from './profile/profile-preference.service';
import { PrismaUserProfileRepository } from './repositories/prisma-user-profile.repository';
import { USER_PROFILE_REPOSITORY } from './repositories/user-profile.repository';
import { MATCH_LIST_RANK_REBUILD_PORT } from '../workers/match-list-rank.ports';

/**
 * Product me-profile module.
 *
 * Module-level `forwardRef(() => WorkerModule)` kept (Sprint 38 Story 2) — see WorkerModule
 * comment. MATCH_LIST_RANK_REBUILD_PORT is exported for MatchListRankQueueService ModuleRef.
 */
@Module({
  imports: [
    PrismaModule,
    SessionModule,
    UsersModule,
    RedisCacheModule,
    forwardRef(() => AuthModule),
    EvaluateServiceModule,
    LlmModule,
    PhotoStorageModule,
    forwardRef(() => MessagingRealtimeModule),
    NotificationsModule,
    forwardRef(() => WorkerModule),
    ContentModerationModule,
  ],
  controllers: [MeProfileController],
  providers: [
    MeProfileService,
    ProfileModerationService,
    ProfilePreferenceService,
    {
      provide: USER_PROFILE_REPOSITORY,
      useClass: PrismaUserProfileRepository,
    },
    ProfileCrudService,
    ProfilePhotoService,
    ProfileAnalysisSubmitService,
    ProfileQualityService,
    MeProfileAnalysisService,
    MeProfileMatchesService,
    MeMatchesService,
    {
      provide: MATCH_LIST_RANK_REBUILD_PORT,
      useExisting: MeMatchesService,
    },
    MeMatchActionsService,
    MeMatchFeedbackService,
    MeConversationsService,
    ConversationMessageRateLimitService,
    MeConversationMessagesService,
    MutualMatchesService,
    MeProfileValidationPipe,
    MatchNarrativeGenerator,
    MatchNarrativeCacheService,
    ConversationStarterGenerator,
    ConversationStarterCacheService,
    OpenerTrackingService,
  ],
  exports: [
    MeMatchesService,
    MATCH_LIST_RANK_REBUILD_PORT,
    MeConversationsService,
    MeProfileAnalysisService,
  ],
})
export class MeProfileModule {}
