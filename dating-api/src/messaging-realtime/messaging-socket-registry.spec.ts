import { MessagingSocketRegistry } from './messaging-socket-registry.service';
import type { Socket } from 'socket.io';

function mockSocket(sessionId: string, id: string): Socket {
  return {
    id,
    data: { userId: 'user_1', sessionId },
    disconnect: jest.fn(),
  } as unknown as Socket;
}

describe('MessagingSocketRegistry', () => {
  let registry: MessagingSocketRegistry;

  beforeEach(() => {
    registry = new MessagingSocketRegistry();
    registry.resetForTests();
  });

  it('disconnectBySessionId disconnects all sockets for the session', () => {
    const a = mockSocket('sess_1', 'sock_a');
    const b = mockSocket('sess_1', 'sock_b');
    const other = mockSocket('sess_2', 'sock_c');

    registry.register(a);
    registry.register(b);
    registry.register(other);

    registry.disconnectBySessionId('sess_1');

    expect(a.disconnect).toHaveBeenCalledWith(true);
    expect(b.disconnect).toHaveBeenCalledWith(true);
    expect(other.disconnect).not.toHaveBeenCalled();
    expect(registry.activeConnectionCount()).toBe(1);
  });
});
