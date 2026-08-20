import { Injectable } from '@nestjs/common';
import { type ErrorCode } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { SentryBridgeService } from '../observability/sentry-bridge.service';
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
    private readonly sentry: SentryBridgeService,
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

    const unsubscribeUrl = this.unsubscribeTokens.buildUnsubscribeUrl(
      params.userId,
    );
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
      this.sentry.captureException(err, {
        errorCode: params.failCode,
        tags: { subsystem: 'notifications' },
      });
    }
  }

  /** Ops / internal mail — no unsubscribe footer, no userId. */
  async sendOpsBestEffort(params: {
    to: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    okCode: ErrorCode;
    failCode: ErrorCode;
    skippedProviderCode: ErrorCode;
    logContext: string;
  }): Promise<void> {
    if (!this.config.isSendingEnabled) {
      this.obs.trace(
        `ops email skipped provider disabled ${params.logContext} subject=${params.subject}`,
        params.skippedProviderCode,
      );
      return;
    }

    try {
      const provider = this.providerResolver.resolve();
      await provider.send({
        to: params.to,
        subject: params.subject,
        text: params.textBody,
        html: params.htmlBody,
      });
      this.obs.trace(
        `ops email sent ${params.logContext} to=${params.to} subject=${params.subject}`,
        params.okCode,
      );
    } catch (err) {
      this.obs.error(
        `ops email failed ${params.logContext} to=${params.to} subject=${params.subject}`,
        params.failCode,
        err,
      );
      this.sentry.captureException(err, {
        errorCode: params.failCode,
        tags: { subsystem: 'notifications' },
      });
    }
  }
}
