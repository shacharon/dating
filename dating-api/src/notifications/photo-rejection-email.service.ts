import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  REJECTION_REASON_USER_COPY_EN,
  type RejectionReasonCode,
} from '../photo-storage/photo-moderation.types';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class PhotoRejectionEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: EmailNotificationConfigService,
    private readonly email: EmailNotificationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async sendBestEffort(params: {
    userId: string;
    photoId: string;
    rejectionReasonCode: RejectionReasonCode;
  }): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          id: true,
          email: true,
          emailNotificationsEnabled: true,
        },
      });
      if (!user) return;

      if (!user.emailNotificationsEnabled) {
        this.obs.trace(
          `email photo rejection skipped unsubscribed userId=${user.id}`,
          ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
        );
        return;
      }

      const reason = REJECTION_REASON_USER_COPY_EN[params.rejectionReasonCode];
      const url = `${this.config.appPublicUrl}/dating/profile#profile-photos`;
      const subject = 'Your photo was not approved';
      const textBody = `${reason}\n\nYou can upload a new photo here: ${url}`;
      const htmlBody = `<p>${escapeHtml(reason)}</p><p><a href="${escapeHtml(url)}">Upload a new photo</a></p>`;

      await this.email.sendTransactionalBestEffort({
        userId: user.id,
        to: user.email,
        subject,
        textBody,
        htmlBody,
        okCode: ErrorCodes.EMAIL_PHOTO_REJECTION_SEND_OK,
        failCode: ErrorCodes.EMAIL_PHOTO_REJECTION_SEND_FAILED,
        skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
      });
    } catch (err) {
      this.obs.error(
        `email photo rejection notify failed photoId=${params.photoId}`,
        ErrorCodes.EMAIL_PHOTO_REJECTION_SEND_FAILED,
        err,
      );
    }
  }
}
