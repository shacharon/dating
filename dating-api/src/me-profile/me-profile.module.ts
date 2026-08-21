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
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MessageRateLimitStoreProvider } from './conversation-message-rate-limit-store.provider';
import { MESSAGE_RATE_LIMIT_STORE } from './conversation-message-rate-limit.tokens';
import { MeConversationMessagesService } from './me-conversation-messages.service';
import { MeConversationsService } from './me-conversations.service';
import { MeMatchActionsService } from './me-match-actions.service';
import { MeMatchFeedbackService } from './me-match-feedback.service';
import { MeMatchesService } from './me-matches.service';
import { MatchListQueryService } from './matches/match-list-query.service';
import { MatchEligibilityService } from './matches/match-eligibility.service';
import { MatchRankingService } from './matches/match-ranking.service';
import { MatchListCacheService } from './matches/match-list-cache.service';
import { MatchDetailService } from './matches/match-detail.service';
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
import { PrismaMatchRepository } from './repositories/prisma-match.repository';
import { MATCH_REPOSITORY } from './repositories/match.repository';
import { PrismaConversationRepository } from './repositories/prisma-conversation.repository';
import { CONVERSATION_REPOSITORY } from './repositories/conversation.repository';
import { MATCH_LIST_RANK_REBUILD_PORT } from '../workers/match-list-rank.ports';
import { MatchingPolicyModule } from '../matching-policy/matching-policy.module';
import { MATCH_FEEDBACK_REPOSITORY } from './repositories/match-feedback.repository';
import { PrismaMatchFeedbackRepository } from './repositories/prisma-match-feedback.repository';

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
    MatchingPolicyModule,
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
    {
      provide: MATCH_REPOSITORY,
      useClass: PrismaMatchRepository,
    },
    {
      provide: MATCH_FEEDBACK_REPOSITORY,
      useClass: PrismaMatchFeedbackRepository,
    },
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: PrismaConversationRepository,
    },
    ProfileCrudService,
    ProfilePhotoService,
    ProfileAnalysisSubmitService,
    ProfileQualityService,
    MeProfileAnalysisService,
    MeProfileMatchesService,
    MatchListQueryService,
    MatchEligibilityService,
    MatchRankingService,
    MatchListCacheService,
    MatchDetailService,
    MeMatchesService,
    {
      provide: MATCH_LIST_RANK_REBUILD_PORT,
      useExisting: MeMatchesService,
    },
    MeMatchActionsService,
    MeMatchFeedbackService,
    MeConversationsService,
    MessageRateLimitStoreProvider,
    {
      provide: MESSAGE_RATE_LIMIT_STORE,
      useExisting: MessageRateLimitStoreProvider,
    },
    ConversationMessageRateLimitService,
    MeConversationMessagesService,
    MutualMatchesService,
    MeProfileValidationPipe,
    MatchNarrativeGenerator,
    MatchNarrativeCacheService,
  ],
  exports: [
    MeMatchesService,
    MATCH_LIST_RANK_REBUILD_PORT,
    MeConversationsService,
    MeProfileAnalysisService,
  ],
})
export class MeProfileModule {}
