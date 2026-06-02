import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EvaluateServiceModule } from '../evaluate/evaluate-service.module';
import { PhotoStorageModule } from '../photo-storage/photo-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MeConversationMessagesService } from './me-conversation-messages.service';
import { MeConversationsService } from './me-conversations.service';
import { MeMatchActionsService } from './me-match-actions.service';
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
    AuthModule,
    EvaluateServiceModule,
    PhotoStorageModule,
  ],
  controllers: [MeProfileController],
  providers: [
    MeProfileService,
    MeProfileAnalysisService,
    MeProfileMatchesService,
    MeMatchesService,
    MeMatchActionsService,
    MeConversationsService,
    ConversationMessageRateLimitService,
    MeConversationMessagesService,
    MutualMatchesService,
    MeProfileValidationPipe,
  ],
  exports: [MeMatchesService],
})
export class MeProfileModule {}
