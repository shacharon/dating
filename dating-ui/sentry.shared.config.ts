import type { BrowserOptions } from '@sentry/nextjs';

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') {
    return fallback;
  }
  const n = Number.parseFloat(raw.trim());
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    return fallback;
  }
  return n;
}

export function getSentryUiDsn(): string | undefined {
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim();
  return dsn === '' ? undefined : dsn;
}

export function getSentryUiOptions(): BrowserOptions {
  const dsn = getSentryUiDsn();
  const environment =
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV ||
    'development';
  const isProd = environment === 'production';

  if (!dsn) {
    return { enabled: false };
  }

  return {
    dsn,
    environment,
    enabled: true,
    tracesSampleRate: parseSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
      isProd ? 0.1 : 0,
    ),
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        if (headers.cookie) headers.cookie = '[Filtered]';
        if (headers.Cookie) headers.Cookie = '[Filtered]';
        if (headers.authorization) headers.authorization = '[Filtered]';
        if (headers.Authorization) headers.Authorization = '[Filtered]';
        event.request.headers = headers;
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  };
}
