import type { ContentViolationService } from '../content-moderation/content-violation.service';
import {
  MuteExpiryEnforcer,
  resolveMuteExpiryIntervalMs,
  CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT,
} from './mute-expiry.cron';

describe('resolveMuteExpiryIntervalMs', () => {
  it('defaults to 15 minutes when unset', () => {
    expect(resolveMuteExpiryIntervalMs({})).toBe(
      CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT,
    );
  });

  it('disables for 0 / off / false', () => {
    expect(
      resolveMuteExpiryIntervalMs({ CONTENT_MUTE_EXPIRY_INTERVAL_MS: '0' }),
    ).toBeNull();
    expect(
      resolveMuteExpiryIntervalMs({ CONTENT_MUTE_EXPIRY_INTERVAL_MS: 'off' }),
    ).toBeNull();
    expect(
      resolveMuteExpiryIntervalMs({ CONTENT_MUTE_EXPIRY_INTERVAL_MS: 'false' }),
    ).toBeNull();
  });

  it('parses positive interval', () => {
    expect(
      resolveMuteExpiryIntervalMs({ CONTENT_MUTE_EXPIRY_INTERVAL_MS: '60000' }),
    ).toBe(60_000);
  });
});

describe('MuteExpiryEnforcer', () => {
  const violations = {
    clearExpiredMutes: jest.fn().mockResolvedValue(2),
  } as unknown as ContentViolationService;

  const prev = process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS;

  afterEach(() => {
    if (prev === undefined) delete process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS;
    else process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = prev;
    jest.clearAllMocks();
  });

  it('does not start timer when disabled', () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = '0';
    const enforcer = new MuteExpiryEnforcer(violations);
    enforcer.onModuleInit();
    expect(enforcer.isTimerActive()).toBe(false);
    enforcer.onModuleDestroy();
  });

  it('starts timer when enabled', () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = '60000';
    const enforcer = new MuteExpiryEnforcer(violations);
    enforcer.onModuleInit();
    expect(enforcer.isTimerActive()).toBe(true);
    enforcer.onModuleDestroy();
    expect(enforcer.isTimerActive()).toBe(false);
  });

  it('tick calls clearExpiredMutes', async () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = '0';
    const enforcer = new MuteExpiryEnforcer(violations);
    const n = await enforcer.tick();
    expect(n).toBe(2);
    expect(violations.clearExpiredMutes).toHaveBeenCalledTimes(1);
  });

  it('re-entrancy skips overlapping tick', async () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = '0';
    let resolveClear!: (n: number) => void;
    (violations.clearExpiredMutes as jest.Mock).mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveClear = resolve;
        }),
    );
    const enforcer = new MuteExpiryEnforcer(violations);
    const first = enforcer.tick();
    const second = await enforcer.tick();
    expect(second).toBe(0);
    resolveClear(1);
    await expect(first).resolves.toBe(1);
    expect(violations.clearExpiredMutes).toHaveBeenCalledTimes(1);
  });
});
