import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagingRealtimeModule } from '../messaging-realtime/messaging-realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EvaluateServiceModule } from '../evaluate/evaluate-service.module';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { RedisCacheModule } from '../cache/redis-cache.module';
import { WorkerModule } from '../workers/worker.module';
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

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    UsersModule,
    RedisCacheModule,
    forwardRef(() => AuthModule),
    EvaluateServiceModule,
    PhotoStorageModule,
    forwardRef(() => MessagingRealtimeModule),
    NotificationsModule,
    forwardRef(() => WorkerModule),
  ],
  controllers: [MeProfileController],
  providers: [
    MeProfileService,
    MeProfileAnalysisService,
    MeProfileMatchesService,
    MeMatchesService,
    MeMatchActionsService,
    MeMatchFeedbackService,
    MeConversationsService,
    ConversationMessageRateLimitService,
    MeConversationMessagesService,
    MutualMatchesService,
    MeProfileValidationPipe,
  ],
  exports: [
    MeMatchesService,
    MeConversationsService,
    MeProfileAnalysisService,
  ],
})
export class MeProfileModule {}
