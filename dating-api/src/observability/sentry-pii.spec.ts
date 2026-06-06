import type { ErrorEvent } from '@sentry/node';
import { sentryBeforeBreadcrumb, sentryBeforeSend } from './sentry-pii';

function baseEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    event_id: 'evt',
    platform: 'node',
    timestamp: 1,
    environment: 'test',
    ...overrides,
  } as ErrorEvent;
}

describe('sentry-pii', () => {
  it('redacts cookie and authorization headers', () => {
    const event = baseEvent({
      request: {
        url: '/api/v1/me/profile',
        headers: {
          cookie: 'dating_session=secret',
          authorization: 'Bearer x',
          accept: 'application/json',
        },
      },
    });

    const out = sentryBeforeSend(event, {} as never);
    expect(out?.request?.headers?.cookie).toBe('[Filtered]');
    expect(out?.request?.headers?.authorization).toBe('[Filtered]');
    expect(out?.request?.headers?.accept).toBe('application/json');
  });

  it('drops request body on sensitive routes', () => {
    const event = baseEvent({
      request: {
        url: '/api/v1/me/conversations/c1/messages',
        data: '{"text":"hello"}',
        headers: {},
      },
    });

    const out = sentryBeforeSend(event, {} as never);
    expect(out?.request?.data).toBeUndefined();
  });

  it('scrubs email-related extras', () => {
    const event = baseEvent({
      extra: { to: 'user@example.com', subsystem: 'notifications' },
    });

    const out = sentryBeforeSend(event, {} as never);
    expect(out?.extra?.to).toBe('[Filtered]');
    expect(out?.extra?.subsystem).toBe('notifications');
  });

  it('removes user email and ip', () => {
    const event = baseEvent({
      user: { id: 'u1', email: 'a@b.com', ip_address: '1.2.3.4' },
    });

    const out = sentryBeforeSend(event, {} as never);
    expect(out?.user?.id).toBe('u1');
    expect(out?.user?.email).toBeUndefined();
    expect(out?.user?.ip_address).toBeUndefined();
  });

  it('strips breadcrumb body on auth URLs', () => {
    const crumb = sentryBeforeBreadcrumb({
      category: 'http',
      data: { url: '/api/v1/auth/me', body: 'x' },
    });
    expect(crumb?.data?.body).toBeUndefined();
  });
});
