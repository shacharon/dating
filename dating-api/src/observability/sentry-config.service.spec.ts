import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { SentryConfigService } from './sentry-config.service';

describe('SentryConfigService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('is disabled without DSN', async () => {
    delete process.env.SENTRY_DSN;
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [SentryConfigService],
    }).compile();

    const cfg = moduleRef.get(SentryConfigService);
    expect(cfg.isEnabled).toBe(false);
    expect(cfg.initOptions).toBeNull();
  });

  it('parses sample rates when DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [SentryConfigService],
    }).compile();

    const cfg = moduleRef.get(SentryConfigService);
    expect(cfg.isEnabled).toBe(true);
    expect(cfg.tracesSampleRate).toBe(0.25);
  });

  it('disables sentry-test route in production without override', async () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    process.env.SENTRY_ENVIRONMENT = 'production';
    delete process.env.ENABLE_SENTRY_TEST;
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [SentryConfigService],
    }).compile();

    const cfg = moduleRef.get(SentryConfigService);
    expect(cfg.sentryTestRouteEnabled).toBe(false);
  });
});
