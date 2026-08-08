import type { RedisCacheService } from '../cache/redis-cache.service';
import type { ContentViolationService } from '../content-moderation/content-violation.service';
import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  CRON_LOCK_MUTE_EXPIRY,
  muteExpiryLockTtlSeconds,
} from './cron-leader.lock';
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

  const cache = {
    tryAcquireCronLock: jest.fn().mockResolvedValue('acquired'),
  } as unknown as RedisCacheService;

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;

  const prev = process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS;
  const prevFailOpen = process.env.CRON_LEADER_FAIL_OPEN;

  afterEach(() => {
    if (prev === undefined) delete process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS;
    else process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = prev;
    if (prevFailOpen === undefined) delete process.env.CRON_LEADER_FAIL_OPEN;
    else process.env.CRON_LEADER_FAIL_OPEN = prevFailOpen;
    jest.clearAllMocks();
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('acquired');
  });

  function makeEnforcer() {
    return new MuteExpiryEnforcer(violations, cache, obs);
  }

  it('does not start timer when disabled', () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = '0';
    const enforcer = makeEnforcer();
    enforcer.onModuleInit();
    expect(enforcer.isTimerActive()).toBe(false);
    enforcer.onModuleDestroy();
  });

  it('starts timer when enabled', () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = '60000';
    const enforcer = makeEnforcer();
    enforcer.onModuleInit();
    expect(enforcer.isTimerActive()).toBe(true);
    enforcer.onModuleDestroy();
    expect(enforcer.isTimerActive()).toBe(false);
  });

  it('tick calls clearExpiredMutes when lock acquired', async () => {
    process.env.CONTENT_MUTE_EXPIRY_INTERVAL_MS = String(
      CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT,
    );
    const enforcer = makeEnforcer();
    const n = await enforcer.tick();
    expect(n).toBe(2);
    expect(violations.clearExpiredMutes).toHaveBeenCalledTimes(1);
    expect(cache.tryAcquireCronLock).toHaveBeenCalledWith(
      CRON_LOCK_MUTE_EXPIRY,
      muteExpiryLockTtlSeconds(CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT),
      expect.objectContaining({
        pid: process.pid,
        at: expect.any(String),
        host: expect.any(String),
      }),
    );
    expect(obs.trace).toHaveBeenCalledWith(
      'mute-expiry cron leader acquired',
      ErrorCodes.CRON_LEADER_ACQUIRED,
    );
  });

  it('skips clearExpiredMutes when lock not_acquired', async () => {
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('not_acquired');
    const enforcer = makeEnforcer();
    await expect(enforcer.tick()).resolves.toBe(0);
    expect(violations.clearExpiredMutes).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
      ErrorCodes.CRON_LEADER_SKIPPED,
    );
  });

  it('skips clearExpiredMutes when lock unavailable', async () => {
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('unavailable');
    const enforcer = makeEnforcer();
    await expect(enforcer.tick()).resolves.toBe(0);
    expect(violations.clearExpiredMutes).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
      ErrorCodes.CRON_LEADER_UNAVAILABLE,
    );
  });

  it('runs when lock unavailable but CRON_LEADER_FAIL_OPEN=1', async () => {
    process.env.CRON_LEADER_FAIL_OPEN = '1';
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('unavailable');
    const enforcer = makeEnforcer();
    await expect(enforcer.tick()).resolves.toBe(2);
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
    const enforcer = makeEnforcer();
    const first = enforcer.tick();
    const second = await enforcer.tick();
    expect(second).toBe(0);
    resolveClear(1);
    await expect(first).resolves.toBe(1);
    expect(violations.clearExpiredMutes).toHaveBeenCalledTimes(1);
  });
});
