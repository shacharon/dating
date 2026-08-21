import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { displayLabel } from './email-format.util';
import { EmailRecipientHelper } from './email-recipient.helper';
import { buildNewMessageEmail } from './email-templates';
import { MessageEmailDebounceService } from './message-email-debounce.service';

@Injectable()
export class NewMessageEmailService {
  constructor(
    private readonly recipients: EmailRecipientHelper,
    private readonly config: EmailNotificationConfigService,
    private readonly socketRegistry: MessagingSocketRegistry,
    private readonly debounce: MessageEmailDebounceService,
    private readonly email: EmailNotificationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async maybeNotifyBestEffort(params: {
    conversationId: string;
    recipientUserId: string;
    senderUserId: string;
    messageId: string;
  }): Promise<void> {
    let claimed = false;
    try {
      if (params.recipientUserId === params.senderUserId) {
        return;
      }

      if (await this.socketRegistry.hasActiveConnection(params.recipientUserId)) {
        this.obs.trace(
          `email message skipped recipient online userId=${params.recipientUserId} conversationId=${params.conversationId}`,
          ErrorCodes.EMAIL_SKIPPED_RECIPIENT_ONLINE,
        );
        return;
      }

      const [recipient, sender] = await Promise.all([
        this.recipients.loadRecipient(params.recipientUserId),
        this.recipients.loadUserWithLabel(params.senderUserId),
      ]);

      if (!recipient?.email) {
        return;
      }

      if (
        this.recipients.shouldSkipUnsubscribed({
          userId: params.recipientUserId,
          enabled: recipient.emailNotificationsEnabled,
          emailKind: 'message',
        })
      ) {
        return;
      }

      // Claim after eligibility so no-email / unsubscribed do not burn the window.
      if (
        !(await this.debounce.tryClaimSend(
          params.conversationId,
          params.recipientUserId,
        ))
      ) {
        this.obs.trace(
          `email message skipped debounced userId=${params.recipientUserId} conversationId=${params.conversationId}`,
          ErrorCodes.EMAIL_SKIPPED_DEBOUNCED,
        );
        return;
      }
      claimed = true;

      const senderLabel = displayLabel(
        sender?.profile?.nickname,
        sender?.displayName,
      );
      const url = `${this.config.appPublicUrl}/dating/conversations/${params.conversationId}`;
      const { subject, textBody, htmlBody } = buildNewMessageEmail({
        senderLabel,
        url,
      });

      await this.email.sendTransactionalBestEffort({
        userId: recipient.id,
        to: recipient.email,
        subject,
        textBody,
        htmlBody,
        okCode: ErrorCodes.EMAIL_MESSAGE_SEND_OK,
        failCode: ErrorCodes.EMAIL_MESSAGE_SEND_FAILED,
        skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
      });
    } catch (err) {
      if (claimed) {
        await this.debounce.releaseClaim(
          params.conversationId,
          params.recipientUserId,
        );
      }
      this.obs.error(
        `email message notify failed conversationId=${params.conversationId} messageId=${params.messageId}`,
        ErrorCodes.EMAIL_MESSAGE_SEND_FAILED,
        err,
      );
    }
  }
}
