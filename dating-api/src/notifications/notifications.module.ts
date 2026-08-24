import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { MessagingSocketRegistryModule } from '../messaging-realtime/messaging-socket-registry.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeviceTokensController } from './device-tokens.controller';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { EmailProviderResolver } from './email-provider.resolver';
import { EmailRecipientHelper } from './email-recipient.helper';
import { EmailUnsubscribeController } from './email-unsubscribe.controller';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';
import { MessageEmailDebounceService } from './message-email-debounce.service';
import { MutualMatchEmailService } from './mutual-match-email.service';
import { NewMessageEmailService } from './new-message-email.service';
import { NoopEmailProvider } from './noop-email.provider';
import { PhotoRejectionEmailService } from './photo-rejection-email.service';
import { FcmPushProvider } from './providers/fcm-push.provider';
import { NoopPushProvider } from './providers/noop-push.provider';
import { PushDispatchService } from './push-dispatch.service';
import { PushNotificationConfigService } from './push-notification-config.service';
import { PUSH_NOTIFICATION_PROVIDER } from './push-notification.port';
import { PushProviderResolver } from './push-provider.resolver';
import { ReportOpsEmailService } from './report-ops-email.service';
import { ResendEmailProvider } from './resend-email.provider';
import {
  DEVICE_TOKEN_REPOSITORY,
  PrismaDeviceTokenRepository,
} from './repositories/device-token.repository';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    StructuredLoggingModule,
    MessagingSocketRegistryModule,
    AuthModule,
  ],
  controllers: [EmailUnsubscribeController, DeviceTokensController],
  providers: [
    EmailNotificationConfigService,
    ResendEmailProvider,
    NoopEmailProvider,
    EmailProviderResolver,
    EmailNotificationService,
    EmailUnsubscribeTokenService,
    EmailRecipientHelper,
    MessageEmailDebounceService,
    MutualMatchEmailService,
    NewMessageEmailService,
    ReportOpsEmailService,
    PhotoRejectionEmailService,
    PushNotificationConfigService,
    NoopPushProvider,
    FcmPushProvider,
    PushProviderResolver,
    {
      provide: PUSH_NOTIFICATION_PROVIDER,
      useFactory: (resolver: PushProviderResolver) => resolver.resolve(),
      inject: [PushProviderResolver],
    },
    PrismaDeviceTokenRepository,
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useExisting: PrismaDeviceTokenRepository,
    },
    PushDispatchService,
  ],
  exports: [
    MutualMatchEmailService,
    NewMessageEmailService,
    ReportOpsEmailService,
    PhotoRejectionEmailService,
    PushDispatchService,
    EmailRecipientHelper,
  ],
})
export class NotificationsModule {}
