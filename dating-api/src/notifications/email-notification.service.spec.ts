import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { SentryBridgeService } from '../observability/sentry-bridge.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import type { EmailProviderResolver } from './email-provider.resolver';
import type { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';

describe('EmailNotificationService.sendOpsBestEffort', () => {
  const config = {
    isSendingEnabled: true,
  } as unknown as EmailNotificationConfigService;

  const provider = { send: jest.fn().mockResolvedValue({ id: 'msg_1' }) };
  const providerResolver = {
    resolve: jest.fn(() => provider),
  } as unknown as EmailProviderResolver;

  const unsubscribeTokens = {
    buildUnsubscribeUrl: jest.fn(() => 'http://example/unsub'),
  } as unknown as EmailUnsubscribeTokenService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  const sentry = {
    captureException: jest.fn(),
  } as unknown as SentryBridgeService;

  let service: EmailNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (config as { isSendingEnabled: boolean }).isSendingEnabled = true;
    service = new EmailNotificationService(
      config,
      providerResolver,
      unsubscribeTokens,
      obs,
      sentry,
    );
  });

  const base = {
    to: 'ops@example.com',
    subject: '[dating] User report — spam',
    textBody: 'Report id: r1',
    htmlBody: '<pre>Report id: r1</pre>',
    okCode: ErrorCodes.USER_REPORT_OPS_EMAIL_OK,
    failCode: ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
    skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
    logContext: 'reportId=r1',
  };

  it('skips when provider sending disabled without calling unsubscribe', async () => {
    (config as { isSendingEnabled: boolean }).isSendingEnabled = false;

    await service.sendOpsBestEffort(base);

    expect(provider.send).not.toHaveBeenCalled();
    expect(unsubscribeTokens.buildUnsubscribeUrl).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      'ops email skipped provider disabled reportId=r1 subject=[dating] User report — spam',
      ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
    );
  });

  it('sends raw bodies without unsubscribe footer', async () => {
    await service.sendOpsBestEffort(base);

    expect(unsubscribeTokens.buildUnsubscribeUrl).not.toHaveBeenCalled();
    expect(provider.send).toHaveBeenCalledWith({
      to: 'ops@example.com',
      subject: base.subject,
      text: 'Report id: r1',
      html: '<pre>Report id: r1</pre>',
    });
    expect(obs.trace).toHaveBeenCalledWith(
      'ops email sent reportId=r1 to=ops@example.com subject=[dating] User report — spam',
      ErrorCodes.USER_REPORT_OPS_EMAIL_OK,
    );
  });

  it('captures Sentry on provider failure', async () => {
    const err = new Error('smtp down');
    provider.send.mockRejectedValueOnce(err);

    await service.sendOpsBestEffort(base);

    expect(obs.error).toHaveBeenCalledWith(
      'ops email failed reportId=r1 to=ops@example.com subject=[dating] User report — spam',
      ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
      err,
    );
    expect(sentry.captureException).toHaveBeenCalledWith(err, {
      errorCode: ErrorCodes.USER_REPORT_OPS_EMAIL_FAILED,
      tags: { subsystem: 'notifications' },
    });
  });
});
