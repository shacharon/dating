import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import {
  acquireMessagingSocket,
  getMessagingSocketOrigin,
  releaseMessagingSocket,
  resetMessagingSocketForTests,
} from './messaging-socket';

const ioMock = vi.hoisted(() =>
  vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
);

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

describe('getMessagingSocketOrigin', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalInternal = process.env.INTERNAL_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalInternal === undefined) {
      delete process.env.INTERNAL_API_URL;
    } else {
      process.env.INTERNAL_API_URL = originalInternal;
    }
  });

  it('uses NEXT_PUBLIC_API_URL when set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/';
    expect(getMessagingSocketOrigin()).toBe('https://api.example.com');
  });

  it('uses window hostname when set (INTERNAL_API_URL is server-only fallback)', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.INTERNAL_API_URL = 'http://127.0.0.1:4000';
    // Browser/jsdom: cookie host alignment prefers UI hostname over INTERNAL.
    expect(getMessagingSocketOrigin()).toBe(
      `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_API_PORT?.trim() || '3001'}`,
    );
  });

  it('uses window hostname + API port when no explicit URL (cookie host alignment)', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.INTERNAL_API_URL;
    const prevPort = process.env.NEXT_PUBLIC_API_PORT;
    process.env.NEXT_PUBLIC_API_PORT = '3001';

    expect(getMessagingSocketOrigin()).toBe(
      `${window.location.protocol}//${window.location.hostname}:3001`,
    );

    if (prevPort === undefined) {
      delete process.env.NEXT_PUBLIC_API_PORT;
    } else {
      process.env.NEXT_PUBLIC_API_PORT = prevPort;
    }
  });
});

describe('acquireMessagingSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMessagingSocketForTests();
  });

  afterEach(() => {
    resetMessagingSocketForTests();
  });

  it('configures socket.io reconnection with exponential backoff', () => {
    acquireMessagingSocket();

    expect(ioMock).toHaveBeenCalledWith(
      expect.stringContaining('/ws/messaging'),
      expect.objectContaining({
        path: '/socket.io',
        withCredentials: true,
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 10_000,
        randomizationFactor: 0.5,
        transports: ['polling', 'websocket'],
        upgrade: true,
      }),
    );
  });

  it('reuses one socket for multiple consumers', () => {
    const first = acquireMessagingSocket();
    const second = acquireMessagingSocket();

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('disconnects only when the last consumer releases (debounced)', async () => {
    vi.useFakeTimers();
    const socket = acquireMessagingSocket() as {
      connected: boolean;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    };
    socket.connected = false;
    socket.connect = vi.fn();
    socket.disconnect = vi.fn();

    acquireMessagingSocket();
    releaseMessagingSocket();
    expect(socket.disconnect).not.toHaveBeenCalled();

    releaseMessagingSocket();
    expect(socket.disconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
