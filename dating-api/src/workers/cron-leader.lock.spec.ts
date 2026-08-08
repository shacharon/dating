import {
  isCronLeaderFailOpen,
  muteExpiryLockTtlSeconds,
  shouldRunCronTick,
} from './cron-leader.lock';

describe('cron-leader.lock helpers', () => {
  it('muteExpiryLockTtlSeconds uses 90% of interval with 60s floor', () => {
    expect(muteExpiryLockTtlSeconds(15 * 60 * 1000)).toBe(810);
    expect(muteExpiryLockTtlSeconds(30_000)).toBe(60);
    expect(muteExpiryLockTtlSeconds(60_000)).toBe(60);
  });

  it('isCronLeaderFailOpen accepts 1/true/yes only', () => {
    expect(isCronLeaderFailOpen({})).toBe(false);
    expect(isCronLeaderFailOpen({ CRON_LEADER_FAIL_OPEN: '0' })).toBe(false);
    expect(isCronLeaderFailOpen({ CRON_LEADER_FAIL_OPEN: '1' })).toBe(true);
    expect(isCronLeaderFailOpen({ CRON_LEADER_FAIL_OPEN: 'TRUE' })).toBe(true);
    expect(isCronLeaderFailOpen({ CRON_LEADER_FAIL_OPEN: 'yes' })).toBe(true);
  });

  it('shouldRunCronTick: acquired runs; not_acquired skips', () => {
    expect(shouldRunCronTick('acquired', {})).toBe(true);
    expect(shouldRunCronTick('not_acquired', {})).toBe(false);
    expect(
      shouldRunCronTick('not_acquired', { CRON_LEADER_FAIL_OPEN: '1' }),
    ).toBe(false);
  });

  it('shouldRunCronTick: unavailable skips unless CRON_LEADER_FAIL_OPEN', () => {
    expect(shouldRunCronTick('unavailable', {})).toBe(false);
    expect(
      shouldRunCronTick('unavailable', { CRON_LEADER_FAIL_OPEN: '1' }),
    ).toBe(true);
  });
});
