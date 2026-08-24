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
import { ConversationMessageRateLimitService } from './conversations/conversation-message-rate-limit.service';
import { MessageRateLimitStoreProvider } from './conversations/conversation-message-rate-limit-store.provider';
import { MESSAGE_RATE_LIMIT_STORE } from './conversations/conversation-message-rate-limit.tokens';
import { MeConversationMessagesService } from './conversations/me-conversation-messages.service';
import { MeConversationMessageListService } from './conversations/me-conversation-message-list.service';
import { MeConversationMessageSendService } from './conversations/me-conversation-message-send.service';
import { MeConversationMessageFanoutService } from './conversations/me-conversation-message-fanout.service';
import { ConversationListService } from './conversations/conversation-list.service';
import { ConversationReadStateService } from './conversations/conversation-read-state.service';
import { ConversationLifecycleService } from './conversations/conversation-lifecycle.service';
import { MeConversationsService } from './conversations/me-conversations.service';
import { MeMatchActionsService } from './matches/actions/me-match-actions.service';
import { MeMatchFeedbackService } from './matches/actions/me-match-feedback.service';
import { MeMatchesService } from './matches/core/me-matches.service';
import { MatchListQueryService } from './matches/list/match-list-query.service';
import { MatchEligibilityService } from './matches/detail/match-eligibility.service';
import { MatchRankingService } from './matches/list/ranking/match-ranking.service';
import { MatchListCandidateLoaderService } from './matches/list/ranking/match-list-candidate-loader.service';
import { MatchListCandidateScorerService } from './matches/list/ranking/match-list-candidate-scorer.service';
import { MatchListResponseAssemblerService } from './matches/list/ranking/match-list-response-assembler.service';
import { MatchListRankTelemetryService } from './matches/list/ranking/match-list-rank-telemetry.service';
import { MatchListCacheService } from './matches/list/match-list-cache.service';
import { MatchDetailQueryService } from './matches/detail/match-detail-query.service';
import { MatchDetailPhotoService } from './matches/detail/match-detail-photo.service';
import { MatchDetailService } from './matches/detail/match-detail.service';
import { MutualMatchesService } from './matches/actions/mutual-matches.service';
import { MeProfileAnalysisService } from './profile/me-profile-analysis.service';
import { MeProfileMatchesService } from './matches/core/me-profile-matches.service';
import { MeProfileController } from './me-profile.controller';
import { MeProfileService } from './profile/me-profile.service';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';
import { ProfileQualityService } from './profile/profile-quality.service';
import { ProfileAnalysisSubmitService } from './profile/profile-analysis-submit.service';
import { ProfileCrudService } from './profile/profile-crud.service';
import { ProfileModerationService } from './profile/profile-moderation.service';
import { ProfilePhotoService } from './profile/profile-photo.service';
import { ProfilePreferenceService } from './profile/profile-preference.service';
import { PrismaUserProfileRepository } from './repositories/prisma-user-profile.repository';
import { USER_PROFILE_REPOSITORY } from './repositories/user-profile.repository';
import { PrismaMatchRepository } from './repositories/prisma-match.repository';
import {
  MATCH_ACTIONS_REPOSITORY,
  MATCH_QUERY_REPOSITORY,
  MATCH_RANK_REPOSITORY,
  MATCH_REPOSITORY,
} from './repositories/match.repository';
import { PrismaConversationRepository } from './repositories/prisma-conversation.repository';
import { CONVERSATION_REPOSITORY } from './repositories/conversation.repository';
import { MATCH_LIST_RANK_REBUILD_PORT } from '../workers/match-list-rank.ports';
import { MatchingPolicyModule } from '../matching-policy/matching-policy.module';
import { MATCH_FEEDBACK_REPOSITORY } from './repositories/match-feedback.repository';
import { PrismaMatchFeedbackRepository } from './repositories/prisma-match-feedback.repository';
import { MATCH_NARRATIVE_CACHE_REPOSITORY } from './repositories/match-narrative-cache.repository';
import { PrismaMatchNarrativeCacheRepository } from './repositories/prisma-match-narrative-cache.repository';

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
      provide: MATCH_QUERY_REPOSITORY,
      useExisting: MATCH_REPOSITORY,
    },
    {
      provide: MATCH_ACTIONS_REPOSITORY,
      useExisting: MATCH_REPOSITORY,
    },
    {
      provide: MATCH_RANK_REPOSITORY,
      useExisting: MATCH_REPOSITORY,
    },
    {
      provide: MATCH_FEEDBACK_REPOSITORY,
      useClass: PrismaMatchFeedbackRepository,
    },
    {
      provide: MATCH_NARRATIVE_CACHE_REPOSITORY,
      useClass: PrismaMatchNarrativeCacheRepository,
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
    MatchListCandidateLoaderService,
    MatchListCandidateScorerService,
    MatchListResponseAssemblerService,
    MatchListRankTelemetryService,
    MatchRankingService,
    MatchListCacheService,
    MatchDetailQueryService,
    MatchDetailPhotoService,
    MatchDetailService,
    MeMatchesService,
    {
      provide: MATCH_LIST_RANK_REBUILD_PORT,
      useExisting: MeMatchesService,
    },
    MeMatchActionsService,
    MeMatchFeedbackService,
    ConversationListService,
    ConversationReadStateService,
    ConversationLifecycleService,
    MeConversationsService,
    MessageRateLimitStoreProvider,
    {
      provide: MESSAGE_RATE_LIMIT_STORE,
      useExisting: MessageRateLimitStoreProvider,
    },
    ConversationMessageRateLimitService,
    MeConversationMessageListService,
    MeConversationMessageFanoutService,
    MeConversationMessageSendService,
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
