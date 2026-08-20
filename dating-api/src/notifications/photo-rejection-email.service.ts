import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  REJECTION_REASON_USER_COPY_EN,
  type RejectionReasonCode,
} from '../photo-storage/photo-moderation.types';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { escapeHtml } from './email-format.util';
import { EmailRecipientHelper } from './email-recipient.helper';

@Injectable()
export class PhotoRejectionEmailService {
  constructor(
    private readonly recipients: EmailRecipientHelper,
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
      const user = await this.recipients.loadRecipient(params.userId);
      if (!user) return;

      if (
        this.recipients.shouldSkipUnsubscribed({
          userId: user.id,
          enabled: user.emailNotificationsEnabled,
          emailKind: 'photo rejection',
        })
      ) {
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
