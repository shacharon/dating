import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { SentryBridgeService } from './sentry-bridge.service';
import { SentryConfigService } from './sentry-config.service';

jest.mock('@sentry/node', () => ({
  withScope: jest.fn((cb: (scope: { setTag: jest.Mock; setUser: jest.Mock; setLevel: jest.Mock }) => void) => {
    cb({
      setTag: jest.fn(),
      setUser: jest.fn(),
      setLevel: jest.fn(),
    });
  }),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

describe('SentryBridgeService', () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
    jest.clearAllMocks();
  });

  it('does not call Sentry when DSN is unset', async () => {
    delete process.env.SENTRY_DSN;
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [SentryConfigService, SentryBridgeService],
    }).compile();

    const bridge = moduleRef.get(SentryBridgeService);
    bridge.captureException(new Error('test'));
    bridge.captureMessage('test');

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('calls Sentry when DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [SentryConfigService, SentryBridgeService],
    }).compile();

    const bridge = moduleRef.get(SentryBridgeService);
    bridge.captureException(new Error('boom'), {
      errorCode: 'HTTP_UNHANDLED',
      tags: { subsystem: 'http' },
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('calls captureMessage with level when DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [SentryConfigService, SentryBridgeService],
    }).compile();

    const bridge = moduleRef.get(SentryBridgeService);
    bridge.captureMessage('messaging ws auth failed', {
      errorCode: 'MESSAGING_WS_AUTH_FAILED',
      tags: { subsystem: 'messaging-realtime', reason: 'no_cookie' },
      level: 'warning',
    });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'messaging ws auth failed',
      'warning',
    );
  });
});
