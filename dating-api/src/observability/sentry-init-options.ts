import type { NodeOptions } from '@sentry/node';
import { sentryBeforeBreadcrumb, sentryBeforeSend } from './sentry-pii';

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

export function readSentryDsnFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const dsn = env.SENTRY_DSN?.trim();
  return dsn === '' ? undefined : dsn;
}

export function buildSentryInitOptions(args: {
  dsn: string;
  environment?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}): NodeOptions {
  const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
  const isProd = nodeEnv === 'production';

  return {
    dsn: args.dsn,
    environment: args.environment?.trim() || nodeEnv,
    tracesSampleRate:
      args.tracesSampleRate ??
      parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, isProd ? 0.1 : 0),
    profilesSampleRate:
      args.profilesSampleRate ??
      parseSampleRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0),
    beforeSend: sentryBeforeSend,
    beforeBreadcrumb: sentryBeforeBreadcrumb,
  };
}
