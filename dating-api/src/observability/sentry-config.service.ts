import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildSentryInitOptions,
  readSentryDsnFromEnv,
} from './sentry-init-options';

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

@Injectable()
export class SentryConfigService {
  private readonly dsnValue: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.dsnValue =
      this.config.get<string>('SENTRY_DSN')?.trim() ||
      readSentryDsnFromEnv();
  }

  get isEnabled(): boolean {
    return Boolean(this.dsnValue);
  }

  get dsn(): string | undefined {
    return this.dsnValue;
  }

  get environment(): string {
    return (
      this.config.get<string>('SENTRY_ENVIRONMENT')?.trim() ||
      this.config.get<string>('NODE_ENV')?.trim() ||
      'development'
    );
  }

  get tracesSampleRate(): number {
    const isProd = this.environment === 'production';
    return parseSampleRate(
      this.config.get<string>('SENTRY_TRACES_SAMPLE_RATE'),
      isProd ? 0.1 : 0,
    );
  }

  get profilesSampleRate(): number {
    return parseSampleRate(
      this.config.get<string>('SENTRY_PROFILES_SAMPLE_RATE'),
      0,
    );
  }

  get initOptions() {
    if (!this.dsnValue) {
      return null;
    }
    return buildSentryInitOptions({
      dsn: this.dsnValue,
      environment: this.environment,
      tracesSampleRate: this.tracesSampleRate,
      profilesSampleRate: this.profilesSampleRate,
    });
  }

  /** Guarded Sentry smoke route (non-production by default). */
  get sentryTestRouteEnabled(): boolean {
    if (!this.isEnabled) {
      return false;
    }
    const force = this.config.get<string>('ENABLE_SENTRY_TEST')?.trim();
    if (['1', 'true', 'yes', 'on'].includes((force ?? '').toLowerCase())) {
      return true;
    }
    return this.environment !== 'production';
  }
}
