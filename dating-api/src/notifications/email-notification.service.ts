import { Injectable } from '@nestjs/common';
import { ErrorCodes, type ErrorCode } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailProviderResolver } from './email-provider.resolver';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';

@Injectable()
export class EmailNotificationService {
  constructor(
    private readonly config: EmailNotificationConfigService,
    private readonly providerResolver: EmailProviderResolver,
    private readonly unsubscribeTokens: EmailUnsubscribeTokenService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async sendTransactionalBestEffort(params: {
    userId: string;
    to: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    okCode: ErrorCode;
    failCode: ErrorCode;
    skippedProviderCode: ErrorCode;
  }): Promise<void> {
    if (!this.config.isSendingEnabled) {
      this.obs.trace(
        `email skipped provider disabled userId=${params.userId} subject=${params.subject}`,
        params.skippedProviderCode,
      );
      return;
    }

    const unsubscribeUrl = this.unsubscribeTokens.buildUnsubscribeUrl(params.userId);
    const text = `${params.textBody}\n\nUnsubscribe: ${unsubscribeUrl}`;
    const html = `${params.htmlBody}<p style="margin-top:16px;font-size:12px;color:#666"><a href="${unsubscribeUrl}">Unsubscribe</a> from Piza email notifications.</p>`;

    try {
      const provider = this.providerResolver.resolve();
      await provider.send({
        to: params.to,
        subject: params.subject,
        text,
        html,
      });
      this.obs.trace(
        `email sent userId=${params.userId} to=${params.to} subject=${params.subject}`,
        params.okCode,
      );
    } catch (err) {
      this.obs.error(
        `email send failed userId=${params.userId} to=${params.to} subject=${params.subject}`,
        params.failCode,
        err,
      );
    }
  }
}
