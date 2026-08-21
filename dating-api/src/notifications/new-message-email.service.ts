import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { MessageEmailDebounceService } from './message-email-debounce.service';

function displayLabel(nickname: string | null | undefined, displayName: string | null | undefined): string {
  const n = nickname?.trim();
  if (n) return n;
  const d = displayName?.trim();
  if (d) return d;
  return 'Someone';
}

@Injectable()
export class NewMessageEmailService {
  constructor(
    private readonly prisma: PrismaService,
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

      if (
        !this.debounce.shouldSend(
          params.conversationId,
          params.recipientUserId,
        )
      ) {
        this.obs.trace(
          `email message skipped debounced userId=${params.recipientUserId} conversationId=${params.conversationId}`,
          ErrorCodes.EMAIL_SKIPPED_DEBOUNCED,
        );
        return;
      }

      const [recipient, sender] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: params.recipientUserId },
          select: {
            id: true,
            email: true,
            emailNotificationsEnabled: true,
          },
        }),
        this.prisma.user.findUnique({
          where: { id: params.senderUserId },
          select: {
            displayName: true,
            profile: { select: { nickname: true } },
          },
        }),
      ]);

      if (!recipient?.email) {
        return;
      }

      if (!recipient.emailNotificationsEnabled) {
        this.obs.trace(
          `email message skipped unsubscribed userId=${params.recipientUserId}`,
          ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
        );
        return;
      }

      const senderLabel = displayLabel(
        sender?.profile?.nickname,
        sender?.displayName,
      );
      const url = `${this.config.appPublicUrl}/dating/conversations/${params.conversationId}`;
      const subject = 'New message on Piza';
      const textBody = `${senderLabel} sent you a message. Read it here: ${url}`;
      const htmlBody = `<p><strong>${escapeHtml(senderLabel)}</strong> sent you a message.</p><p><a href="${url}">Read it here</a></p>`;

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

      this.debounce.recordSent(params.conversationId, params.recipientUserId);
    } catch (err) {
      this.obs.error(
        `email message notify failed conversationId=${params.conversationId} messageId=${params.messageId}`,
        ErrorCodes.EMAIL_MESSAGE_SEND_FAILED,
        err,
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
