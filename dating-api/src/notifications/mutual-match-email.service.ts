import { Injectable } from '@nestjs/common';
import type { MutualMatch } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { displayLabel, escapeHtml } from './email-format.util';
import { EmailRecipientHelper } from './email-recipient.helper';

@Injectable()
export class MutualMatchEmailService {
  constructor(
    private readonly recipients: EmailRecipientHelper,
    private readonly config: EmailNotificationConfigService,
    private readonly email: EmailNotificationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async notifyNewMutualMatchBestEffort(match: MutualMatch): Promise<void> {
    try {
      const [user1, user2] = await Promise.all([
        this.recipients.loadUserWithLabel(match.userId1),
        this.recipients.loadUserWithLabel(match.userId2),
      ]);
      if (!user1 || !user2) {
        return;
      }

      const url = `${this.config.appPublicUrl}/dating/conversations/${match.id}`;
      const label2 = displayLabel(user2.profile?.nickname, user2.displayName);
      const label1 = displayLabel(user1.profile?.nickname, user1.displayName);

      await Promise.allSettled([
        this.sendToUser({
          userId: user1.id,
          email: user1.email,
          enabled: user1.emailNotificationsEnabled,
          otherLabel: label2,
          url,
        }),
        this.sendToUser({
          userId: user2.id,
          email: user2.email,
          enabled: user2.emailNotificationsEnabled,
          otherLabel: label1,
          url,
        }),
      ]);
    } catch (err) {
      this.obs.error(
        `email mutual match notify failed conversationId=${match.id}`,
        ErrorCodes.EMAIL_MUTUAL_MATCH_SEND_FAILED,
        err,
      );
    }
  }

  private async sendToUser(params: {
    userId: string;
    email: string;
    enabled: boolean;
    otherLabel: string;
    url: string;
  }): Promise<void> {
    if (
      this.recipients.shouldSkipUnsubscribed({
        userId: params.userId,
        enabled: params.enabled,
        emailKind: 'mutual match',
      })
    ) {
      return;
    }

    const subject = "It's a match on Piza!";
    const textBody = `You matched with ${params.otherLabel}. Start the conversation: ${params.url}`;
    const htmlBody = `<p>You matched with <strong>${escapeHtml(params.otherLabel)}</strong>!</p><p><a href="${params.url}">Start the conversation</a></p>`;

    await this.email.sendTransactionalBestEffort({
      userId: params.userId,
      to: params.email,
      subject,
      textBody,
      htmlBody,
      okCode: ErrorCodes.EMAIL_MUTUAL_MATCH_SEND_OK,
      failCode: ErrorCodes.EMAIL_MUTUAL_MATCH_SEND_FAILED,
      skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
    });
  }
}
