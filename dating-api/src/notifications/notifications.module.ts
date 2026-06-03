import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { EmailProviderResolver } from './email-provider.resolver';
import { EmailUnsubscribeController } from './email-unsubscribe.controller';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';
import { MessageEmailDebounceService } from './message-email-debounce.service';
import { MutualMatchEmailService } from './mutual-match-email.service';
import { NewMessageEmailService } from './new-message-email.service';
import { NoopEmailProvider } from './noop-email.provider';
import { ResendEmailProvider } from './resend-email.provider';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    StructuredLoggingModule,
    MessagingSocketRegistryModule,
  ],
  controllers: [EmailUnsubscribeController],
  providers: [
    EmailNotificationConfigService,
    ResendEmailProvider,
    NoopEmailProvider,
    EmailProviderResolver,
    EmailNotificationService,
    EmailUnsubscribeTokenService,
    MessageEmailDebounceService,
    MutualMatchEmailService,
    NewMessageEmailService,
  ],
  exports: [MutualMatchEmailService, NewMessageEmailService],
})
export class NotificationsModule {}
