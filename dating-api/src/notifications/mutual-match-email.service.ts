import { Injectable } from '@nestjs/common';
import type { MutualMatch } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';

function displayLabel(nickname: string | null | undefined, displayName: string | null | undefined): string {
  const n = nickname?.trim();
  if (n) return n;
  const d = displayName?.trim();
  if (d) return d;
  return 'someone';
}

@Injectable()
export class MutualMatchEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: EmailNotificationConfigService,
    private readonly email: EmailNotificationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async notifyNewMutualMatchBestEffort(match: MutualMatch): Promise<void> {
    try {
      const [user1, user2] = await Promise.all([
        this.loadUser(match.userId1),
        this.loadUser(match.userId2),
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
    if (!params.enabled) {
      this.obs.trace(
        `email mutual match skipped unsubscribed userId=${params.userId}`,
        ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
      );
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

  private loadUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailNotificationsEnabled: true,
        profile: { select: { nickname: true } },
      },
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
