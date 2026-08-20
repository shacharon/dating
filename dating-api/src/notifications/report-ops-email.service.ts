import { Injectable } from '@nestjs/common';
import type { UserReport } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import { buildReportOpsEmail } from './email-templates';

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

    const { subject, textBody, htmlBody } = buildReportOpsEmail(report);

    await this.email.sendOpsBestEffort({
      to,
      subject,
      textBody,
      htmlBody,
      okCode: ErrorCodes.USER_REPORT_OPS_EMAIL_OK,
      failCode: ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
      skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
      logContext: `reportId=${report.id}`,
    });
  }
}
