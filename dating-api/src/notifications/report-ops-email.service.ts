import { Injectable } from '@nestjs/common';
import type { UserReport } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { escapeHtml } from './email-format.util';

@Injectable()
export class ReportOpsEmailService {
  constructor(
    private readonly config: EmailNotificationConfigService,
    private readonly email: EmailNotificationService,
  ) {}

  async notifyReportCreatedBestEffort(report: UserReport): Promise<void> {
    const to = this.config.reportOpsEmail;
    if (!to) {
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

    await this.email.sendOpsBestEffort({
      to,
      subject,
      textBody: text,
      htmlBody: `<pre>${escapeHtml(text)}</pre>`,
      okCode: ErrorCodes.USER_REPORT_OPS_EMAIL_OK,
      failCode: ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
      skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
      logContext: `reportId=${report.id}`,
    });
  }
}
