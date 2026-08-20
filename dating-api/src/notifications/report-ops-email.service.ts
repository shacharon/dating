import { Injectable } from '@nestjs/common';
import type { UserReport } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { SentryBridgeService } from '../observability/sentry-bridge.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailProviderResolver } from './email-provider.resolver';
import { escapeHtml } from './email-format.util';

@Injectable()
export class ReportOpsEmailService {
  constructor(
    private readonly config: EmailNotificationConfigService,
    private readonly providerResolver: EmailProviderResolver,
    private readonly obs: StructuredObservabilityService,
    private readonly sentry: SentryBridgeService,
  ) {}

  async notifyReportCreatedBestEffort(report: UserReport): Promise<void> {
    const to = this.config.reportOpsEmail;
    if (!to) {
      return;
    }
    if (!this.config.isSendingEnabled) {
      this.obs.trace(
        `report ops email skipped provider disabled reportId=${report.id}`,
        ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
      );
      return;
    }

    const subject = `[dating] User report — ${report.reason}`;
    const lines = [
      `Report id: ${report.id}`,
      `Reason: ${report.reason}`,
      `Reporter user id: ${report.reporterUserId}`,
      `Reported user id: ${report.reportedUserId}`,
      `Context: ${report.contextType} / ${report.contextId}`,
      `Created at: ${report.createdAt.toISOString()}`,
    ];
    if (report.details) {
      lines.push('', 'Details:', report.details);
    }
    const text = lines.join('\n');

    try {
      const provider = this.providerResolver.resolve();
      await provider.send({
        to,
        subject,
        text,
        html: `<pre>${escapeHtml(text)}</pre>`,
      });
      this.obs.trace(
        `report ops email sent reportId=${report.id} to=${to}`,
        ErrorCodes.USER_REPORT_OPS_EMAIL_OK,
      );
    } catch (err) {
      this.obs.error(
        `report ops email failed reportId=${report.id}`,
        ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
        err,
      );
      this.sentry.captureException(err, {
        errorCode: ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
        tags: { subsystem: 'notifications' },
      });
    }
  }
}
