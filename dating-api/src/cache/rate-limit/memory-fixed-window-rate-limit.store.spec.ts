import { MemoryFixedWindowRateLimitStore } from './memory-fixed-window-rate-limit.store';

class LimitExceededError extends Error {
  constructor() {
    super('exceeded');
    this.name = 'LimitExceededError';
  }
}

describe('MemoryFixedWindowRateLimitStore', () => {
  const maxPerWindow = 3;
  const windowMs = 60_000;

  function createStore() {
    return new MemoryFixedWindowRateLimitStore(
      { maxPerWindow, windowMs },
      () => new LimitExceededError(),
    );
  }

  it('allows up to maxPerWindow then throws', () => {
    const store = createStore();
    store.consume('u1');
    store.consume('u1');
    store.consume('u1');
    expect(() => store.consume('u1')).toThrow(LimitExceededError);
  });

  it('isolates counters per userId', () => {
    const store = createStore();
    for (let i = 0; i < maxPerWindow; i++) {
      store.consume('a');
    }
    expect(() => store.consume('b')).not.toThrow();
  });

  it('resetForTests clears buckets', () => {
    const store = createStore();
    for (let i = 0; i < maxPerWindow; i++) {
      store.consume('u1');
    }
    store.resetForTests();
    expect(() => store.consume('u1')).not.toThrow();
  });

  it('opens a new window after resetAt', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const store = createStore();
    for (let i = 0; i < maxPerWindow; i++) {
      store.consume('u1');
    }
    expect(() => store.consume('u1')).toThrow(LimitExceededError);
    jest.setSystemTime(new Date('2026-01-01T00:01:00.001Z'));
    expect(() => store.consume('u1')).not.toThrow();
    jest.useRealTimers();
  });
});
