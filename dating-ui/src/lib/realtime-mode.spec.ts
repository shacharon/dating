import { describe, it, expect, afterEach } from 'vitest';
import { getRealtimeMode } from './realtime-mode';

describe('getRealtimeMode', () => {
  const original = process.env.NEXT_PUBLIC_REALTIME;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_REALTIME;
    } else {
      process.env.NEXT_PUBLIC_REALTIME = original;
    }
  });

  it('returns ws when env is ws', () => {
    process.env.NEXT_PUBLIC_REALTIME = 'ws';
    expect(getRealtimeMode()).toBe('ws');
  });

  it('returns poll when env is unset', () => {
    delete process.env.NEXT_PUBLIC_REALTIME;
    expect(getRealtimeMode()).toBe('poll');
  });

  it('returns poll for invalid values', () => {
    process.env.NEXT_PUBLIC_REALTIME = 'websocket';
    expect(getRealtimeMode()).toBe('poll');
  });
});
