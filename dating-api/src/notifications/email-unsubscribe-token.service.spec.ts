import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';

describe('EmailUnsubscribeTokenService', () => {
  const config = {
    unsubscribeSecret: 'test-unsubscribe-secret-pepper',
    appPublicUrl: 'http://localhost:3000',
  } as EmailNotificationConfigService;

  let service: EmailUnsubscribeTokenService;

  beforeEach(() => {
    service = new EmailUnsubscribeTokenService(config);
  });

  it('sign + verify round-trips userId', () => {
    const token = service.sign('user_abc');
    expect(service.verify(token)).toEqual({ userId: 'user_abc' });
  });

  it('returns null for tampered signature', () => {
    const token = service.sign('user_abc');
    const [body] = token.split('.', 2);
    expect(service.verify(`${body}.tampered-signature`)).toBeNull();
  });

  it('returns null for expired token', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const token = service.sign('user_abc');

    jest.spyOn(Date, 'now').mockReturnValue(now + 91 * 24 * 60 * 60 * 1000);
    expect(service.verify(token)).toBeNull();

    jest.restoreAllMocks();
  });

  it('buildUnsubscribeUrl includes encoded token', () => {
    const url = service.buildUnsubscribeUrl('user_abc');
    expect(url).toMatch(
      /^http:\/\/localhost:3000\/api\/v1\/notifications\/email\/unsubscribe\?token=/,
    );
    const token = decodeURIComponent(url.split('token=')[1] ?? '');
    expect(service.verify(token)).toEqual({ userId: 'user_abc' });
  });
});
