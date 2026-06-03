import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessagingSocket } from './messaging-socket';

const ioMock = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

vi.mock('@/lib/api-base', () => ({
  getApiBase: () => '',
}));

describe('createMessagingSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures socket.io reconnection with exponential backoff', () => {
    createMessagingSocket();

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
      }),
    );
  });
});
