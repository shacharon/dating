import type { UserReport } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import { ReportOpsEmailService } from './report-ops-email.service';

describe('ReportOpsEmailService', () => {
  const config = {
    reportOpsEmail: 'ops@example.com' as string | undefined,
  } as unknown as EmailNotificationConfigService;

  const email = {
    sendOpsBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailNotificationService;

  let service: ReportOpsEmailService;

  const report = {
    id: 'rep_1',
    reason: 'spam',
    reporterUserId: 'u_reporter',
    reportedUserId: 'u_reported',
    contextType: 'MESSAGE',
    contextId: 'msg_1',
    createdAt: new Date('2026-08-20T12:00:00.000Z'),
    details: 'looks fishy',
  } as unknown as UserReport;

  beforeEach(() => {
    jest.clearAllMocks();
    (config as { reportOpsEmail: string | undefined }).reportOpsEmail =
      'ops@example.com';
    service = new ReportOpsEmailService(config, email);
  });

  it('no-ops when reportOpsEmail unset', async () => {
    (config as { reportOpsEmail: string | undefined }).reportOpsEmail =
      undefined;

    await service.notifyReportCreatedBestEffort(report);

    expect(email.sendOpsBestEffort).not.toHaveBeenCalled();
  });

  it('delegates to sendOpsBestEffort with codes and reportId context', async () => {
    await service.notifyReportCreatedBestEffort(report);

    expect(email.sendOpsBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        subject: '[dating] User report — spam',
        textBody: expect.stringContaining('Report id: rep_1'),
        htmlBody: expect.stringContaining('<pre>'),
        okCode: ErrorCodes.USER_REPORT_OPS_EMAIL_OK,
        failCode: ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
        skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
        logContext: 'reportId=rep_1',
      }),
    );
    const arg = (email.sendOpsBestEffort as jest.Mock).mock.calls[0][0];
    expect(arg.textBody).toContain('looks fishy');
    expect(arg.htmlBody).toContain('looks fishy');
  });
});
